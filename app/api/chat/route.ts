// 進捗通知用のヘルパー関数
const notifyProgress = (type: string, data: any) => {
  try {
    // グローバル変数への安全な書き込み
    if (typeof global !== 'undefined') {
      global.htmlGenerationProgress = { type, data };
      console.log(`🔔 Progress notification sent: ${type} - ${data.message || data}`);
    }
  } catch (error) {
    console.error('Progress notification error:', error);
  }
};

// グローバル型定義
declare global {
  var htmlGenerationProgress: {
    type: string;
    data: any;
  } | null;
}

// LLM provider functions
async function callOpenAI(messages: any[], systemPrompt: string, stream: boolean = true) {
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
  // const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: formattedMessages,
      // input: formattedMessages,
      stream: stream,
      temperature: 0.5
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  return response;
}

async function callOllama(userMessage: string, systemPrompt: string, stream: boolean = true) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-oss:20b',
      system: systemPrompt,
      prompt: userMessage,
      stream: stream,
      options: {
        temperature: 0.5,
      }    
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  return response;
}

export async function POST(req: Request) {
  const { messages, stream = true } = await req.json();

  try {
    // HTML生成開始を通知
    notifyProgress('html_generation_started', { message: 'AI応答処理を開始しました' });
    // Get the latest user message
    const userMessage = messages[messages.length - 1]?.content || '';
    
    // Prepare system prompt
    const systemPrompt = `あなたは電力・ガス業界の専門分析AIです。以下の役割を果たしてください：

1. 電力・ガス業界の取引データ分析
2. 市場動向の解説
3. 業界特有の専門用語を使った分析
4. データに基づいた洞察の提供
5. HTML形式のレポート生成

### 重要：出力フォーマット
必ずJSON形式で出力してください。他の形式は一切認めません：

{
    "answer": "回答結果（マークダウンなし、改行なしの平文）",
    "html": "完全なHTMLファイル内容"
}

### 遵守事項
- 回答は日本語で、業界の専門知識を活用して詳細かつ正確な分析を行ってください。
- 出力は必ず上記JSON形式に準拠すること。JSONの外に文字を書かないこと。
- ですます調で回答すること。
- answerはマークダウンなどの記法を使わず、改行のない平文とすること。出来る限り長い文章にすること。
- HTMLは完全なHTMLドキュメントとし、<!DOCTYPE html>から</html>まで含めること。
- HTMLには文章での分析結果は図やグラフも活用すること。JavaScript (Papa Parse + Chart.js) でパース・集計・描画すること。
- セマンティックHTML、効率的なCSS（Flexbox/Grid活用、PC・印刷対応、CSS量抑制）。
- テーマに沿った落ち着いたカラーの選択。WCAG 2.1 AA基準のコントラスト比。
- JTF日本語標準スタイルガイドを意識した、新社会人でも読みやすい平易な文章。
- 本文は可読性の高いモダンなゴシック体を採用する

**重要：回答はJSONのみ。説明文や挨拶は不要ですが、ですます調で文章は構成すること。**
`;

    // Determine which LLM provider to use
    const useOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';
    let apiResponse;

    if (useOpenAI) {
      console.log('Using OpenAI API with gpt-4o-mini');
      notifyProgress('llm_provider_selected', { message: 'OpenAI APIを使用しています' });
      apiResponse = await callOpenAI(messages, systemPrompt, stream);
    } else {
      console.log('Using Ollama (local LLM)');
      notifyProgress('llm_provider_selected', { message: 'Ollama（ローカルLLM）を使用しています' });
      apiResponse = await callOllama(userMessage, systemPrompt, stream);
    }
    
    if (stream) {
      // 共通のストリーミング処理
      return handleStreamingResponse(apiResponse, useOpenAI);
    } else {
      // 非ストリーミング処理
      if (useOpenAI) {
        return handleOpenAINonStreamingResponse(apiResponse);
      } else {
        return handleOllamaNonStreamingResponse(apiResponse);
      }
    }

  } catch (error) {
    console.error('API Error:', error);
    
    notifyProgress('error', { 
      message: 'API処理中にエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    const errorMessage = error instanceof Error && error.message.includes('OpenAI') 
      ? 'OpenAI APIに接続できません。APIキーが正しく設定されていることを確認してください。'
      : 'Ollamaサーバーに接続できません。サーバーが起動していることを確認してください。';
    
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 共通ストリーミングレスポンスハンドラー
async function handleStreamingResponse(response: Response, isOpenAI: boolean | "" | undefined) {
  const encoder = new TextEncoder();
  
  const responseStream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';
      let streaming_available = true;
      
      // 共通のパターンマッチング設定
      const pattern = /html/;
      const jogais = [/^\{\n$/, /^\{\r\n$/, /^\{\"$/, /^\"\:\"$/, /^\"$/, /^answer$/, /^\"\,$/, /^\{$/, /^\}$/, /^$/, /^ \"$/, /^\"\:$/, /^   $/, /^\{^"$/, /^\",\"$/];
      const contents_end = /\"\,/;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          
          // プロバイダー別の応答形式パース
          const responses = parseProviderResponse(chunk, buffer, isOpenAI);
          
          for (const { content, isDone, newBuffer } of responses) {
            buffer = newBuffer;
            
            if (content) {
              fullResponse += content;
              console.log('Response chunk:', '"' + content + '"');
            }
            
            if (isDone) {
              console.log('=== STREAMING COMPLETED ===');
              await processFullResponse(fullResponse);
              controller.close();
              return;
            }

            // 共通のストリーミング出力処理
            if (streaming_available && content) {
              // 1. 除外文字と一致したらキューに詰めない
              if (jogais.some((val) => val.test(content))) {
                console.log('"' + content + '" 除外！');
                continue;
              }
              
              // 2. HTMLというキーワードが出てきたら終了
              if (pattern.test(content)) {
                console.log('"' + content + '" 終了！');
                controller.close();
                streaming_available = false;
                notifyProgress('ai_response_completed', { message: 'AI応答が完了しました' });
                notifyProgress('html_parsing_started', { message: 'HTML解析を開始しています' });
                continue;
              }
              
              // 3. 文末文字を除外してキュー詰め
              if (contents_end.test(content)) {
                let tmp = content.replace(/\"\,/g, "");
                if (tmp !== '"') {
                  controller.enqueue(encoder.encode(tmp));
                  console.log('"' + tmp + '" 文末文字！');
                }
              } else {
                // 4. 上記以外は普通にキュー詰め
                controller.enqueue(encoder.encode(content));
              }
            }
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}

// プロバイダー別の応答形式パース
function parseProviderResponse(chunk: string, buffer: string, isOpenAI: boolean | "" | undefined) {
  const responses = [];
  
  if (isOpenAI) {
    // OpenAI形式のパース
    const lines = chunk.split('\n').filter(line => line.trim() && line.startsWith('data: '));
    
    for (const line of lines) {
      const data = line.replace('data: ', '');
      
      // TODO
      if (data === '[DONE]') {
        responses.push({ content: null, isDone: true, newBuffer: '' });
        continue;
      }
      // if (data === '') {
      //   continue;
      // }
      
      try {
        const parsed = JSON.parse(data);
        // TODO
        if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
        // if (parsed.type) {
          // TODO
          // if (parsed.type === "response.output_text.done") {
          //   responses.push({ content: null, isDone: true, newBuffer: '' });
          //   console.log("response.output_text.done");
          //   break;
          // } else if (parsed.type !== "response.output_text.delta") {
          //   continue;
          // }
          // TODO
          const content = parsed.choices[0].delta.content;
          // const content = parsed.delta.content;
          responses.push({ content: content, isDone: false, newBuffer: '' });
        }
      } catch (e) {
        console.warn('Failed to parse OpenAI chunk:', data);
        responses.push({ content: null, isDone: false, newBuffer: '' });
      }
    }
  } else {
    // Ollama形式のパース
    const lines = chunk.split('\n').filter(line => line.trim());
    let currentBuffer = buffer;
    
    for (const line of lines) {
      try {
        const combinedLine = currentBuffer + line;
        const data = JSON.parse(combinedLine);
        
        currentBuffer = '';
        
        responses.push({ 
          content: data.response || null, 
          isDone: data.done || false, 
          newBuffer: currentBuffer 
        });
      } catch (e) {
        currentBuffer = line;
      }
    }
    
    // 最後のバッファ状態を反映
    if (responses.length === 0) {
      responses.push({ content: null, isDone: false, newBuffer: currentBuffer });
    } else {
      responses[responses.length - 1].newBuffer = currentBuffer;
    }
  }
  
  return responses;
}

// 共通の処理関数
async function processFullResponse(fullResponse: string) {
  console.log(`ストリーミング完了時に全文解析: ${fullResponse}`);
  try {
    const parsedData = JSON.parse(fullResponse);
    if (parsedData.html) {
      console.log('=== JSON FORMAT DETECTED: Processing HTML content ===');
      await saveHtmlFile(parsedData.html);
    } else if (parsedData.answer) {
      console.log('=== JSON FORMAT WITHOUT HTML: Creating fallback HTML ===');
      throw new Error('No HTML content in JSON response');
    }
  } catch (parseError) {
    console.log('=== JSON PARSING FAILED ===');
    if (!fullResponse.trim().startsWith('{')) {
      console.log('=== FALLBACK: Creating HTML from plain text ===');
      await createFallbackHtml(fullResponse);
    } else {
      notifyProgress('error', { 
        message: 'HTML解析中にエラーが発生しました',
        error: parseError instanceof Error ? parseError.message : 'Unknown error' 
      });
    }
  }
}

async function saveHtmlFile(htmlContent: string) {
  notifyProgress('file_saving_started', { message: 'HTMLファイルを保存しています' });
  
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace('T', '_');
  const htmlFileName = `report_${timestamp}.html`;
  
  const fs = require('fs');
  const path = require('path');
  
  // Vercelの書き込み可能な /tmp ディレクトリを使用
  const tmpDir = '/tmp';
  const filePath = path.join(tmpDir, htmlFileName);
  
  // /tmp ディレクトリが存在しない場合は作成（ローカル開発用）
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, htmlContent, 'utf8');
  console.log(`HTML file saved: ${filePath}`);
  
  notifyProgress('file_saved', { 
    message: 'HTMLファイルの保存が完了しました',
    filename: htmlFileName 
  });
}

async function createFallbackHtml(fullResponse: string) {
  notifyProgress('file_saving_started', { message: 'HTMLファイルを保存しています（フォールバック）' });
  
  const fallbackHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>分析レポート</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>電力・ガス業界分析レポート</h1>
            <p>生成日時: ${new Date().toLocaleString('ja-JP')}</p>
        </div>
        <div class="content">
            <h2>分析結果</h2>
            <p>${fullResponse.replace(/\n/g, '<br>')}</p>
        </div>
    </div>
</body>
</html>`;
  
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace('T', '_');
  const htmlFileName = `report_${timestamp}.html`;
  
  const fs = require('fs');
  const path = require('path');
  
  // Vercelの書き込み可能な /tmp ディレクトリを使用
  const tmpDir = '/tmp';
  const filePath = path.join(tmpDir, htmlFileName);
  
  // /tmp ディレクトリが存在しない場合は作成（ローカル開発用）
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, fallbackHtml, 'utf8');
  console.log(`Fallback HTML file saved: ${filePath}`);
  
  notifyProgress('file_saved', { 
    message: 'HTMLファイルの保存が完了しました（フォールバック）',
    filename: htmlFileName 
  });
}

// 非ストリーミングレスポンスハンドラー
async function handleOpenAINonStreamingResponse(response: Response) {
  const data = await response.json();
  
  if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
    const content = data.choices[0].message.content;
    await processFullResponse(content);
    
    return new Response(JSON.stringify({ 
      content: content,
      done: true 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  throw new Error('Unexpected OpenAI response format');
}

async function handleOllamaNonStreamingResponse(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let fullResponse = '';
  
  try {
    const { value } = await reader.read();
    const chunk = decoder.decode(value, { stream: true });

    const data = JSON.parse(chunk);
    if (data.response) {
      fullResponse += data.response;
    }
  } catch (error) {
    throw new Error('Failed to read response');
  }

  return new Response(JSON.stringify({ 
    content: fullResponse,
    done: true 
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}