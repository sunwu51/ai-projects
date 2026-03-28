import { activate } from './index';

describe('opencode-metadata-plugin', () => {
  let interceptor: any;
  
  beforeEach(() => {
    interceptor = null;
    const context = {
      subscriptions: [] as any[],
      interceptRequest: (fn: any) => {
        interceptor = fn;
        context.subscriptions.push(fn);
      }
    };
    activate(context);
  });

  test('adds metadata to anthropic request without existing metadata', () => {
    const opts = {
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      body: JSON.stringify({ model: 'claude-3' })
    };
    const model = {
      options: {
        metadata: {
          user_session_id: 'user123',
          project_id: 'proj456',
          session_id: 'sess789'
        }
      }
    };

    const result = interceptor(opts, model);
    const body = JSON.parse(result.body);
    
    expect(body.metadata.user_id).toBe('user123');
    expect(body.metadata.project_id).toBe('proj456');
    expect(body.metadata.session_id).toBe('sess789');
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
    const model = {
      options: {
        metadata: { user_session_id: 'new' }
      }
    };

    const result = interceptor(opts, model);
    const body = JSON.parse(result.body);
    
    expect(body.metadata.user_id).toBe('existing');
  });

  test('ignores non-anthropic requests', () => {
    const opts = {
      url: 'https://api.openai.com/v1/chat',
      method: 'POST',
      body: JSON.stringify({ model: 'gpt-4' })
    };
    const model = { options: { metadata: { user_session_id: 'user123' } } };

    const result = interceptor(opts, model);
    const body = JSON.parse(result.body);
    
    expect(body.metadata).toBeUndefined();
  });
});
