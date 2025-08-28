export async function GET() {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Vercelの /tmp ディレクトリを使用
    const tmpDir = '/tmp';
    
    // /tmp ディレクトリが存在しない場合（ローカル開発環境）
    if (!fs.existsSync(tmpDir)) {
      return new Response(JSON.stringify({ 
        latestReportFile: null,
        allReportFiles: [],
        message: 'No reports available yet'
      }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    const files = fs.readdirSync(tmpDir);
    
    // report_ で始まるHTMLファイルを検索し、最新のものを取得
    const reportFiles = files
      .filter((file: string) => file.startsWith('report_') && file.endsWith('.html'))
      .sort((a: string, b: string) => {
        // ファイル名のタイムスタンプで降順ソート（新しいものが先頭）
        return b.localeCompare(a);
      });
    
    const latestReportFile = reportFiles[0] || null;
    
    return new Response(JSON.stringify({ 
      latestReportFile,
      allReportFiles: reportFiles 
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error getting latest report:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get latest report file',
      latestReportFile: null 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}