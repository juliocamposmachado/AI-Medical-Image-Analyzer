import { Activity, AlertCircle, TrendingUp, Microscope } from 'lucide-react';
import { AnalysisResult } from '../utils/imageAnalysis';
import { GeminiResponse } from '../services/geminiService';

interface AnalysisResultsProps {
  analysisData: AnalysisResult;
  aiResponse: GeminiResponse | null;
  processedImage: string;
}

export function AnalysisResults({ analysisData, aiResponse, processedImage }: AnalysisResultsProps) {
  const getSeverityColor = (severity: string) => {
    const s = severity.toLowerCase();
    if (s.includes('crítica') || s.includes('alta')) return 'text-red-600 bg-red-50';
    if (s.includes('moderada')) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Microscope className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Análise da Amostra</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Imagem Processada</h3>
            <img
              src={processedImage}
              alt="Imagem processada"
              className="w-full rounded-lg border-2 border-gray-200"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Resultados Quantitativos</h3>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-700">Células Detectadas</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">{analysisData.cellCount}</p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="font-semibold text-gray-700">Células Escuras</span>
              </div>
              <p className="text-3xl font-bold text-orange-600">{analysisData.darkerCells}</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-700">Células Maiores</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">{analysisData.largerCells}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tamanho Médio:</span>
                  <span className="font-semibold">{analysisData.avgCellSize.toFixed(2)} px²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Diferença de Cor Média:</span>
                  <span className="font-semibold">{analysisData.avgColorDiff.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nível de Anomalia:</span>
                  <span className={`font-semibold ${analysisData.anomalyLevel === 'Alto' ? 'text-red-600' : 'text-green-600'}`}>
                    {analysisData.anomalyLevel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {aiResponse && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Análise Inteligente</h2>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-700">Diagnóstico</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSeverityColor(aiResponse.severity)}`}>
                  {aiResponse.severity}
                </span>
              </div>
              <p className="text-gray-700 leading-relaxed">{aiResponse.diagnosis}</p>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Explicação</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{aiResponse.explanation}</p>
            </div>

            {aiResponse.recommendations.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Recomendações</h3>
                <ul className="space-y-2">
                  {aiResponse.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-blue-600 font-bold mt-1">•</span>
                      <span className="leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
              <p className="text-sm text-yellow-800">
                <strong>Aviso:</strong> Esta análise é apenas informativa e não substitui uma consulta médica profissional.
                Sempre consulte um médico especialista para diagnóstico e tratamento adequados.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
