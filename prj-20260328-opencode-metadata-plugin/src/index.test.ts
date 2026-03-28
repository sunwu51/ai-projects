import { activate } from './index';

describe('opencode-metadata-plugin', () => {
  let interceptor: any;
  let eventHandler: any;
  
  beforeEach(() => {
    interceptor = null;
    eventHandler = null;
    const context = {
      subscriptions: [] as any[],
      onEvent: (fn: any) => {
        eventHandler = fn;
        context.subscriptions.push(fn);
      },
      interceptRequest: (fn: any) => {
        interceptor = fn;
        context.subscriptions.push(fn);
      }
    };
    activate(context);
  });

  test('adds metadata to messages request without existing metadata', async () => {
    await eventHandler({ event: { type: 'session.created', properties: { info: { id: 'sess789' } } } });
    
    const opts = {
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      body: JSON.stringify({ model: 'claude-3' })
    };

    const result = interceptor(opts);
    const body = JSON.parse(result.body);
    const userData = JSON.parse(body.metadata.user_id);
    
    expect(userData.session_id).toBe('sess789');
    expect(userData.account_id).toBe('');
    expect(userData.project_id).toBe('');
  });

  test('does not override existing metadata.user_id', () => {
    const opts = {
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      body: JSON.stringify({ 
        model: 'claude-3',
        metadata: { user_id: 'existing' }
      })
    };

    const result = interceptor(opts);
    const body = JSON.parse(result.body);
    
    expect(body.metadata.user_id).toBe('existing');
  });

  test('ignores non-messages requests', () => {
    const opts = {
      url: 'https://api.openai.com/v1/chat',
      method: 'POST',
      body: JSON.stringify({ model: 'gpt-4' })
    };

    const result = interceptor(opts);
    const body = JSON.parse(result.body);
    
    expect(body.metadata).toBeUndefined();
  });
});
