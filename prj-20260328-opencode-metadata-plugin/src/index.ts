let session_id = "";

function createEventHandler() {
  return async ({ event }: any) => {
    if (event.type === "session.created" || event.type === "session.updated") {
      const props = event.properties;
      session_id = props?.info?.id || "";
    }
  };
}

export function activate(context: any) {
  context.subscriptions.push(context.onEvent(createEventHandler()));
  
  context.subscriptions.push(
    context.interceptRequest((opts: any) => {
      if (opts.url?.endsWith('/messages') && opts.method === 'POST') {
        try {
          const body = JSON.parse(opts.body);
          if (!body.metadata?.user_id) {
            body.metadata ||= {};
            body.metadata.user_id = JSON.stringify({
              session_id,
              account_id: "",
              project_id: ""
            });
            opts.body = JSON.stringify(body);
          }
        } catch (e) {}
      }
      return opts;
    })
  );
}
