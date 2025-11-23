import { AnalysisResult } from '../utils/imageAnalysis';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface GeminiAnalysisRequest {
  symptoms: string;
  analysisData: AnalysisResult;
  cellDetails: Array<{
    cellNumber: number;
    area: number;
    sizePercentage: number;
    vertices: number;
    colorDiff: number;
    description: string;
  }>;
}

export interface GeminiResponse {
  diagnosis: string;
  explanation: string;
  recommendations: string[];
  severity: string;
}

export async function analyzeWithGemini(request: GeminiAnalysisRequest): Promise<GeminiResponse> {
  const prompt = buildAnalysisPrompt(request);

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return parseGeminiResponse(text);
}

function buildAnalysisPrompt(request: GeminiAnalysisRequest): string {
  const { symptoms, analysisData, cellDetails } = request;

  return `Você é um especialista em análise médica e patologia. Analise os seguintes dados de uma amostra celular e forneça um diagnóstico detalhado.

SINTOMAS RELATADOS PELO PACIENTE:
${symptoms || 'Nenhum sintoma relatado'}

ANÁLISE DA IMAGEM:
- Total de células detectadas: ${analysisData.cellCount}
- Células escuras (anormais): ${analysisData.darkerCells}
- Células maiores (anormais): ${analysisData.largerCells}
- Tamanho médio das células: ${analysisData.avgCellSize.toFixed(2)} pixels²
- Diferença média de cor: ${analysisData.avgColorDiff.toFixed(2)}
- Nível de anomalia: ${analysisData.anomalyLevel}
- Diagnóstico preliminar: ${analysisData.diagnosis}

DETALHES INDIVIDUAIS DAS CÉLULAS ANORMAIS:
${cellDetails.slice(0, 10).map(cell => `
Célula ${cell.cellNumber}:
- Tamanho: ${cell.sizePercentage.toFixed(2)}% (em relação ao padrão)
- Forma: ${cell.vertices} vértices
- Diferença de cor: ${cell.colorDiff.toFixed(2)}
- Descrição: ${cell.description}
`).join('\n')}

INSTRUÇÕES:
Com base nos dados acima, forneça uma análise detalhada seguindo este formato EXATO:

DIAGNÓSTICO:
[Sua análise do possível diagnóstico]

EXPLICAÇÃO:
[Explicação técnica baseada nos dados fornecidos]

RECOMENDAÇÕES:
- [Recomendação 1]
- [Recomendação 2]
- [Recomendação 3]

SEVERIDADE:
[Baixa/Moderada/Alta/Crítica]

IMPORTANTE:
- Baseie sua análise APENAS nos dados fornecidos
- Considere os sintomas relatados pelo paciente
- Mencione possíveis diagnósticos diferenciais
- Seja específico sobre os achados anormais
- SEMPRE recomende consulta com médico especialista`;
}

function parseGeminiResponse(text: string): GeminiResponse {
  const diagnosisMatch = text.match(/DIAGNÓSTICO:\s*([\s\S]*?)(?=EXPLICAÇÃO:|$)/i);
  const explanationMatch = text.match(/EXPLICAÇÃO:\s*([\s\S]*?)(?=RECOMENDAÇÕES:|$)/i);
  const recommendationsMatch = text.match(/RECOMENDAÇÕES:\s*([\s\S]*?)(?=SEVERIDADE:|$)/i);
  const severityMatch = text.match(/SEVERIDADE:\s*([\s\S]*?)$/i);

  const diagnosis = diagnosisMatch ? diagnosisMatch[1].trim() : 'Análise não disponível';
  const explanation = explanationMatch ? explanationMatch[1].trim() : 'Explicação não disponível';
  const severity = severityMatch ? severityMatch[1].trim() : 'Não especificada';

  let recommendations: string[] = [];
  if (recommendationsMatch) {
    const recText = recommendationsMatch[1].trim();
    recommendations = recText
      .split(/\n|•/)
      .map(r => r.trim())
      .filter(r => r.length > 0 && r !== '-');
  }

  return {
    diagnosis,
    explanation,
    recommendations,
    severity
  };
}

export async function chatWithGemini(message: string, context: string): Promise<string> {
  const prompt = `Você é um assistente médico especializado. Responda à seguinte pergunta considerando o contexto da análise anterior:

CONTEXTO:
${context}

PERGUNTA DO USUÁRIO:
${message}

Forneça uma resposta clara, educativa e empática. Sempre incentive a consulta com profissionais de saúde qualificados.`;

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui gerar uma resposta.';
}
