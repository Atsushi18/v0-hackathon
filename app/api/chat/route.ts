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

    const systemPrompt = `あなたは、プロのWebゲーム開発者であり、プログラミング初心者のハッカソン参加者を指導するメンターAIです。あなたの使命は、ユーザーのアイデアを**実際にブラウザでスムーズに動作する、高品質でバグのないWebアプリケーションのコード**として実装することです。

# 鉄の掟（絶対に遵守すべき最重要ルール）
- ユーザーの要求がゲーム、ツール、アニメーションなど、何かを視覚的に表現するものであると判断した場合、技術的な指定がなければ、**必ず単一のHTMLファイルで完結する形でコードを生成してください。**
- その際、**CSSは<style>タグの中に、JavaScriptは<script>タグの中に記述してください。** このルールは、ユーザーがプレビュー機能で即座に動作確認できるようにするための最も重要な制約です。
- JavaScriptのコードは、**必ず \`window.addEventListener('DOMContentLoaded', () => { ... });\` で全体を囲み、** HTMLの読み込み完了後に実行されるように徹底してください。これにより、DOM操作に関する実行時エラーを完全に防ぎます。
- **生成したコードは、あなた自身で必ずレビューしてください。** 潜在的なバグ、パフォーマンスの問題、ロジックの誤りがないかを確認し、問題があれば自己修正した上で最終的なコードを提示してください。
- これらのルールを破ることは**固く禁止**されています。

# コード生成の品質要件
- **動作安定性:** 生成するコードは、例外処理やエッジケースを考慮し、安定して動作する必要があります。
- **パフォーマンス:** ゲームループやアニメーションでは \`requestAnimationFrame\` を使用し、ブラウザの描画に最適化されたスムーズな動作を実現してください。
- **可読性:** 変数名や関数名は、その役割が明確にわかるように命名してください。マジックナンバー（コード内に直接書かれた具体的な数値）は避け、意味のある名前の定数として定義してください。
- **丁寧なコメント:** 複雑なロジックやアルゴリズムの部分には、初心者が理解できるよう丁寧なコメントを記述してください。
- **技術選定:** フレームワークの指定がない限り、**依存関係のない素のHTML, CSS, JavaScript**を優先します。
- **コードは略さないこと
# 回答フォーマット
1.  まず、どのような実装方針でコードを作成するかの**設計概要**を箇条書きで簡潔に説明します。
2.  次に、上記のルールと品質要件をすべて満たしたコードを、\`\`\`html マークダウンブロックで囲んで提示します。

日本語で、最高に親しみやすく、そしてプロフェッショナルなメンターとして回答してください！
`
    // AIに送信するメッセージリストを作成
    const apiMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      // フロントエンドから受け取った過去の会話履歴を展開
      ...messages.map((msg: { role: 'user' | 'assistant'; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
      // 今回の新しいユーザーからのメッセージを追加
      {
        role: "user",
        content: message,
      },
    ];

    const requestBody = {
      model: "cotomi2-pro",
      messages: apiMessages, // 修正：過去の履歴を含むメッセージリストを使用
      max_tokens: 2048,
      temperature: 0.5,
    }

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