export async function GET() {
  const encoder = new TextEncoder();
  let timeoutId: NodeJS.Timeout | null = null;
  let globalTimeoutId: NodeJS.Timeout | null = null;
  let isActive = true;
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      try {
        // 安全なイベント送信関数
        const sendEvent = (type: string, data: any) => {
          try {
            if (!isActive || isClosed) return;
            const eventData = `data: ${JSON.stringify({ type, data })}\n\n`;
            controller.enqueue(encoder.encode(eventData));
          } catch (error) {
            console.error('SSE送信エラー:', error);
            isClosed = true;
          }
        };

        // 安全なクローズ関数
        const safeClose = () => {
          if (isClosed) return;
          isActive = false;
          isClosed = true;
          
          // 全てのタイマーをクリア
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (globalTimeoutId) {
            clearTimeout(globalTimeoutId);
            globalTimeoutId = null;
          }
          
          try {
            controller.close();
          } catch (e) {
            console.error('Controller close error:', e);
          }
        };

        // 初期状態を送信
        sendEvent('connected', { message: 'HTML進捗監視を開始しました' });

        // グローバル変数の初期化
        if (!global.htmlGenerationProgress) {
          global.htmlGenerationProgress = null;
        }

        // 進捗チェック関数（改善版）
        const checkProgress = () => {
          try {
            if (!isActive || isClosed) {
              return;
            }
            
            if (global.htmlGenerationProgress) {
              const progress = global.htmlGenerationProgress;
              sendEvent(progress.type, progress.data);
              
              // 完了またはエラー時にストリームを終了
              if (progress.type === 'file_saved' || progress.type === 'error') {
                global.htmlGenerationProgress = null;
                setTimeout(safeClose, 500);
                return;
              }
              
              // 処理済みフラグをセット
              global.htmlGenerationProgress = null;
            }
            
            // 継続的にチェック
            if (isActive && !isClosed) {
              timeoutId = setTimeout(checkProgress, 1000);
            }
          } catch (error) {
            console.error('Progress check error:', error);
            if (!isClosed) {
              sendEvent('error', { message: '進捗監視中にエラーが発生しました' });
              setTimeout(safeClose, 100);
            }
          }
        };

        // 初回チェック開始
        checkProgress();
        
        // 60秒でタイムアウト
        globalTimeoutId = setTimeout(() => {
          if (isActive && !isClosed) {
            sendEvent('timeout', { message: 'タイムアウトしました' });
            setTimeout(safeClose, 100);
          }
        }, 60000);

      } catch (error) {
        console.error('SSE初期化エラー:', error);
        if (!isClosed) {
          try {
            const errorData = `data: ${JSON.stringify({ 
              type: 'error', 
              data: { message: 'サーバーエラーが発生しました' } 
            })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
          } catch (e) {
            console.error('エラーレスポンス送信失敗:', e);
          } finally {
            setTimeout(() => {
              if (!isClosed) {
                isClosed = true;
                try {
                  controller.close();
                } catch (e) {
                  console.error('Final close error:', e);
                }
              }
            }, 100);
          }
        }
      }
    },

    cancel() {
      isActive = false;
      isClosed = true;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (globalTimeoutId) {
        clearTimeout(globalTimeoutId);
        globalTimeoutId = null;
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// グローバル型定義
declare global {
  var htmlGenerationProgress: {
    type: string;
    data: any;
  } | null;
}