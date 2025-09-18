import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message, messages } = await request.json()

    const SAKURA_API_KEY = process.env.SAKURA_API_KEY

    console.log("[v0] API Key exists:", !!SAKURA_API_KEY)
    console.log("[v0] API Key length:", SAKURA_API_KEY?.length || 0)

    if (!SAKURA_API_KEY) {
      return NextResponse.json(
        { error: "サーバー側でAPIキーが設定されていません。.env.localファイルにSAKURA_API_KEYを設定してください。" },
        { status: 500 },
      )
    }

    // app/api/chat/route.ts 内の systemPrompt を書き換える

const systemPrompt = `あなたは、プログラミング初心者のハッカソン参加者をサポートするために特化した、非常に優秀なAIアシスタントです。あなたの使命は、ユーザーのアイデアを**実践的で、安全に動作するWebアプリケーションのコード**として実装することです。

# 鉄の掟（最重要ルール）
- ユーザーの要求がゲーム、ツール、アニメーションなど、何かを視覚的に表現するものであると判断した場合、技術的な指定がなければ、**HTML, CSS, JavaScriptの3つのファイルに適切に分割してコードを生成してください。**
- **CSSは<style>タグの中に、JavaScriptは<script>タグの中に記述し、単一のHTMLファイルとして完結させてください。** このルールは、ユーザーがプレビュー機能で即座に動作確認できるようにするための最も重要な制約です。
- 生成するJavaScriptコードは、**必ず \`window.addEventListener('DOMContentLoaded', () => { ... });\` で全体を囲み、HTMLの読み込みが完了してから実行されるようにしてください。** これにより、実行時エラーを防ぎます。
- このルールを破り、複数のファイルに分かれたコードや、安全でないコードを提示することは**固く禁止**されています。

# コード生成の詳細ルール
- 生成するコードは、初心者が読んで理解しやすいように、シンプルでコメントが丁寧であることを心がけてください。
- フレームワークの指定がない限り、**フレームワークを使わない素のHTML, CSS, JavaScript**を優先します。
- 生成するコードは、必ず\`\`\`html という形式で、マークダウンのコードブロックで囲ってください。
- プレビューできない言語（Python等）でのコード生成を明確に求められた場合のみ、その指示に従い、「※このコードはプレビュー機能では動作しません。」と注意書きを添えてください。

日本語で、最高に親しみやすく回答してください！
`
    const requestBody = {
      model: "cotomi2-pro",
      messages: [
        {
          role: "user",
          content: message,
        },
        {
      　　role: "system",
      　　content: systemPrompt, 
    　　},
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }
    //atsshi

    console.log("[v0] Request body:", JSON.stringify(requestBody, null, 2))
    console.log("[v0] API URL:", "https://api.aipf.sakura.ad.jp/openai/v1/chat/completions")

    const response = await fetch("https://api.aipf.sakura.ad.jp/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SAKURA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    console.log("[v0] Response status:", response.status)
    console.log("[v0] Response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] API Error Response:", errorText)
      return NextResponse.json(
        { error: `API呼び出しに失敗しました。ステータス: ${response.status}, エラー: ${errorText}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("[v0] API Success Response:", JSON.stringify(data, null, 2))

    return NextResponse.json({
      content: data.choices?.[0]?.message?.content || "レスポンスの取得に失敗しました。",
    })
  } catch (error) {
    console.error("[v0] Server Error:", error)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}
