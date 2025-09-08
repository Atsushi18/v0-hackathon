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

    const systemPrompt = `あなたはハッカソン参加者をサポートするAIアシスタントです。以下の特徴を持って対応してください：

# 役割
- 初心者でも理解しやすいように説明する
- アイデア出しからコード生成まで幅広くサポート
- ハッカソンの時間制約を意識した実践的なアドバイス
- 楽しく、エネルギッシュな雰囲気で対応

# 対応方針
- 具体的で実装可能なアドバイスを提供
- コードは簡潔で理解しやすいものを心がける
- MVPの考え方を重視
- 技術選択は初心者向けを優先

# 禁止事項
- 複雑すぎる技術の提案
- 時間のかかりすぎる実装の提案
- ネガティブな発言

# 回答フォーマット
- コードを生成する際は、必ず言語名を指定したマークダウンのコードブロックで囲ってください。
- ユーザーからフォーマットの指定がなくても、このルールを厳格に守ってください。

日本語で親しみやすく回答してください。`

    const requestBody = {
      model: "cotomi2-pro",
      messages: [
        {
          role: "user",
          content: message,
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
