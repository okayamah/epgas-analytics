# 電力・ガス特化レポート自動生成アプリ

電力・ガス業界向けのAI分析レポート自動生成システムです。CSVデータをアップロードして、専門的な市場分析レポートをHTML形式で生成できます。

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/okka0127-2219s-projects/v0--gr)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/GYP0cJ4WFwR)

## 主な機能

- **AIチャット分析**: 電力・ガス業界の専門知識を持つAIによるデータ分析
- **HTMLレポート生成**: 図表やグラフを含む包括的なHTML分析レポート
- **CSV対応**: CSVデータのアップロードと自動解析
- **デュアルLLM対応**: OpenAI APIまたはローカルLLM（Ollama）の選択可能
- **リアルタイムストリーミング**: AI応答のリアルタイム表示

## 技術スタック

- **フレームワーク**: Next.js 15.2.4 (App Router)
- **言語**: TypeScript
- **UIライブラリ**: shadcn/ui + Radix UI
- **スタイリング**: Tailwind CSS v4
- **パッケージマネージャー**: pnpm
- **フォント**: Geist Sans/Mono
- **アイコン**: Lucide React
- **テーマ**: next-themes

## ローカル環境での起動手順

### 1. 必要な環境のインストール

#### Node.js のインストール
- [Node.js公式サイト](https://nodejs.org/)から Node.js 18+ をダウンロードしてインストール
- インストール確認: `node --version` および `npm --version`

#### pnpm のインストール (推奨)
```bash
# npm経由でpnpmをインストール
npm install -g pnpm

# インストール確認
pnpm --version
```

または公式の方法:
```bash
# PowerShell (Windows)
iwr https://get.pnpm.io/install.ps1 -useb | iex

# Bash (macOS/Linux)
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### 2. リポジトリのクローン
```bash
git clone <repository-url>
cd epgas-analytics
```

### 3. 依存関係のインストール
```bash
pnpm install
# または
npm install
```

### 4. 環境変数の設定
`.env.local` ファイルを作成してLLMプロバイダーを設定：

#### OpenAI APIを使用する場合:
```bash
cp .env.example .env.local
# .env.localを編集
OPENAI_API_KEY=your_openai_api_key_here
```

#### ローカルLLM（Ollama）を使用する場合:
```bash
# .env.localは作成不要、またはOPENAI_API_KEYを空にする
# Ollamaサーバーを別途起動する必要があります
```

### 5. 開発サーバーの起動
```bash
pnpm dev
# または
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

### 6. その他のコマンド
```bash
# プロダクションビルド
pnpm build

# プロダクションサーバー起動
pnpm start

# リンター実行
pnpm lint
```

## LLMプロバイダーの選択

### OpenAI API (推奨)
- 高品質な応答
- 安定したストリーミング
- `.env.local`で`OPENAI_API_KEY`を設定

### Ollama (ローカルLLM)
- オフライン動作
- プライバシー重視
- 別途Ollamaサーバーの起動が必要
- モデル: `gpt-oss:20b`

## プロジェクト構造

```
├── app/
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # メインページ（EPGASAnalytics）
│   ├── globals.css         # グローバルスタイル
│   └── api/
│       ├── chat/route.ts   # AIチャットAPI (LLM切り替え対応)
│       ├── html-progress/  # HTML生成進捗API
│       └── latest-report/  # 最新レポート取得API
├── components/
│   ├── ui/                 # 再利用可能UIコンポーネント
│   └── theme-provider.tsx  # テーマプロバイダー
├── lib/
│   └── utils.ts           # ユーティリティ関数
├── public/                # 静的ファイル（生成されたHTMLレポート等）
└── .env.example          # 環境変数テンプレート
```

## デプロイメント

本プロジェクトはVercelで自動デプロイされています：

**[https://vercel.com/okka0127-2219s-projects/v0--gr](https://vercel.com/okka0127-2219s-projects/v0--gr)**

## ライセンス

このプロジェクトは[v0.app](https://v0.app)で生成されたプロジェクトベースです。