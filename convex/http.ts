import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Missing webhook secret", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();
    const wh = new Webhook(webhookSecret);

    let event: {
      type: string;
      data: {
        id: string;
        email_addresses: { email_address: string }[];
        first_name: string | null;
        last_name: string | null;
      };
    };

    try {
      event = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as typeof event;
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }

    const { type, data } = event;

    switch (type) {
      case "user.created":
        await ctx.runMutation(api.users.createUser, {
          clerkId: data.id,
          email: data.email_addresses[0]?.email_address ?? "",
          name:
            [data.first_name, data.last_name].filter(Boolean).join(" ") ||
            "User",
        });
        break;

      case "user.updated":
        await ctx.runMutation(api.users.updateUser, {
          clerkId: data.id,
          email: data.email_addresses[0]?.email_address,
          name:
            [data.first_name, data.last_name].filter(Boolean).join(" ") ||
            undefined,
        });
        break;

      case "user.deleted":
        await ctx.runMutation(api.users.deleteUser, {
          clerkId: data.id,
        });
        break;
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
