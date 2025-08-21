import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message, apiKey, messages } = await request.json()

    const SAKURA_API_KEY = process.env.SAKURA_API_KEY

    if (!SAKURA_API_KEY) {
      return NextResponse.json(
        { error: "サーバー側でAPIキーが設定されていません。.env.localファイルにSAKURA_API_KEYを設定してください。" },
        { status: 500 },
      )
    }

    // システムプロンプトを設定（ハッカソン向けにカスタマイズ）
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

日本語で親しみやすく回答してください。`

    // さくらインターネットのAI Platform APIに送信するデータを構築
    const apiMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages.slice(-10).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user",
        content: message,
      },
    ]

    const requestBody = {
      model: "cotomi2-pro", // デフォルトモデル
      messages: apiMessages,
      max_tokens: 1000,
      temperature: 0.7,
    }

    // さくらインターネットのAI Platform APIを呼び出し
    const response = await fetch("https://api.aipf.sakura.ad.jp/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SAKURA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API Error:", errorText)
      return NextResponse.json(
        { error: "API呼び出しに失敗しました。APIキーを確認してください。" },
        { status: response.status },
      )
    }

    const data = await response.json()

    return NextResponse.json({
      content: data.choices?.[0]?.message?.content || "レスポンスの取得に失敗しました。",
    })
  } catch (error) {
    console.error("Server Error:", error)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}
