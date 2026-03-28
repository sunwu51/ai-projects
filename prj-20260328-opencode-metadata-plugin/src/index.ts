export function activate(context: any) {
  context.subscriptions.push(
    context.interceptRequest((opts: any, model: any) => {
      if (opts.url?.includes('anthropic.com') && opts.method === 'POST') {
        try {
          const body = JSON.parse(opts.body);
          if (!body.metadata?.user_id) {
            body.metadata ||= {};
            body.metadata.user_id = model.options?.metadata?.user_session_id;
            body.metadata.project_id = model.options?.metadata?.project_id;
            body.metadata.session_id = model.options?.metadata?.session_id;
            opts.body = JSON.stringify(body);
          }
        } catch (e) {}
      }
      return opts;
    })
  );
}
