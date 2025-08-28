export async function GET(
  _request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const { filename } = params;
    
    // セキュリティ: ファイル名の検証
    if (!filename || !filename.match(/^report_\d{8}_\d{6}\.html$/)) {
      return new Response('Invalid filename', { status: 400 });
    }
    
    // Vercelの /tmp ディレクトリを使用
    const tmpDir = '/tmp';
    const filePath = path.join(tmpDir, filename);
    
    // ファイルの存在確認
    if (!fs.existsSync(filePath)) {
      return new Response('File not found', { status: 404 });
    }
    
    // HTMLファイルを読み取り
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    
    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });
  } catch (error) {
    console.error('Error serving HTML file:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}