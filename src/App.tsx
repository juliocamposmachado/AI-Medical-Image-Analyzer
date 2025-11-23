import { useState } from 'react';
import { Microscope, Loader2 } from 'lucide-react';
import { ImageUpload } from './components/ImageUpload';
import { AnalysisResults } from './components/AnalysisResults';
import { ChatInterface } from './components/ChatInterface';
import { analyzeImage, generateCellDescription, AnalysisResult } from './utils/imageAnalysis';
import { analyzeWithGemini, chatWithGemini, GeminiResponse } from './services/geminiService';
import { supabase } from './lib/supabase';

function App() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [aiResponse, setAiResponse] = useState<GeminiResponse | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeImage(selectedImage);
      setAnalysisResult(result);

      const standardSize = 0.05;
      const cellDetails = result.contours.slice(0, 20).map((contour, idx) => {
        const sizePercentage = (contour.area / standardSize) * 100;
        const description = generateCellDescription(
          sizePercentage,
          contour.vertices,
          contour.avgColor
        );

        return {
          cellNumber: idx + 1,
          area: contour.area,
          sizePercentage,
          vertices: contour.vertices,
          colorDiff: contour.avgColor,
          description
        };
      });

      const geminiResult = await analyzeWithGemini({
        symptoms,
        analysisData: result,
        cellDetails
      });

      setAiResponse(geminiResult);

      const { data: analysisData, error: dbError } = await supabase
        .from('analyses')
        .insert({
          image_url: result.processedImageData,
          symptoms,
          cell_count: result.cellCount,
          darker_cells: result.darkerCells,
          larger_cells: result.largerCells,
          avg_cell_size: result.avgCellSize,
          avg_color_diff: result.avgColorDiff,
          anomaly_level: result.anomalyLevel,
          diagnosis: result.diagnosis,
          ai_response: JSON.stringify(geminiResult)
        })
        .select()
        .maybeSingle();

      if (dbError) {
        console.error('Error saving to database:', dbError);
      } else if (analysisData) {
        setCurrentAnalysisId(analysisData.id);

        const cellDetailsInserts = cellDetails.map(cell => ({
          analysis_id: analysisData.id,
          cell_number: cell.cellNumber,
          area: cell.area,
          perimeter: 0,
          shape_vertices: cell.vertices,
          color_difference: cell.colorDiff,
          size_percentage: cell.sizePercentage,
          description: cell.description
        }));

        await supabase.from('cell_details').insert(cellDetailsInserts);
      }

    } catch (err) {
      console.error('Analysis error:', err);
      setError('Erro ao analisar a imagem. Por favor, tente novamente.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleChatMessage = async (message: string): Promise<string> => {
    if (!analysisResult || !aiResponse) {
      return 'Por favor, realize uma análise primeiro.';
    }

    const context = `
Análise realizada:
- Células detectadas: ${analysisResult.cellCount}
- Células escuras: ${analysisResult.darkerCells}
- Células maiores: ${analysisResult.largerCells}
- Diagnóstico: ${aiResponse.diagnosis}
- Sintomas do paciente: ${symptoms || 'Não informados'}
    `.trim();

    return await chatWithGemini(message, context);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Microscope className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              Análise Celular Inteligente
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Sistema de detecção de anomalias celulares com IA
          </p>
        </header>

        {!analysisResult ? (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Nova Análise
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sintomas do Paciente (opcional)
                  </label>
                  <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Descreva os sintomas apresentados pelo paciente..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                    disabled={analyzing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Imagem da Amostra
                  </label>
                  <ImageUpload
                    onImageSelect={setSelectedImage}
                    disabled={analyzing}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={!selectedImage || analyzing}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold text-lg flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Microscope className="w-5 h-5" />
                      Analisar Amostra
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <button
              onClick={() => {
                setAnalysisResult(null);
                setAiResponse(null);
                setSelectedImage(null);
                setSymptoms('');
                setCurrentAnalysisId(null);
                setError(null);
              }}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Nova Análise
            </button>

            <AnalysisResults
              analysisData={analysisResult}
              aiResponse={aiResponse}
              processedImage={analysisResult.processedImageData}
            />

            <ChatInterface
              onSendMessage={handleChatMessage}
              disabled={!aiResponse}
            />
          </div>
        )}
      </div>

      <footer className="mt-16 py-8 bg-gray-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            Sistema de Análise Celular - Apenas para fins educacionais e informativos
          </p>
          <p className="text-xs mt-2 text-gray-400">
            Não substitui diagnóstico médico profissional
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
