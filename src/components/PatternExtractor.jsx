import { useState, useEffect, useRef } from 'react';
import { PatternExtractor } from '../utils/patternExtractor';
import './PatternExtractor.css';

function PatternExtractorComponent({
  image,
  onPatternExtracted,
  onBack,
}) {
  const [extractionMode, setExtractionMode] = useState('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedPattern, setExtractedPattern] = useState(null);
  const [selectionRegion, setSelectionRegion] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState(null);

  const canvasRef = useRef(null);
  const extractorRef = useRef(new PatternExtractor());

  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      ctx.drawImage(image, 0, 0);
    }
  }, [image]);

  const handleAutoExtract = async () => {
    if (!image) return;

    setIsProcessing(true);
    try {
      const pattern = await extractorRef.current.extractPatternAuto(image);
      setExtractedPattern(pattern);
    } catch (error) {
      console.error('提取失败:', error);
      alert('图案提取失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMouseDown = (e) => {
    if (extractionMode !== 'manual') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setStartPos({ x, y });
    setSelectionRegion(null);
  };

  const handleMouseMove = (e) => {
    if (!isSelecting || !startPos) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const region = {
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y),
    };

    setSelectionRegion(region);
    drawSelection(canvas, region);
  };

  const handleMouseUp = async (e) => {
    if (!isSelecting || !startPos || !selectionRegion) {
      setIsSelecting(false);
      return;
    }

    setIsSelecting(false);

    if (selectionRegion.width > 10 && selectionRegion.height > 10) {
      setIsProcessing(true);
      try {
        const pattern = await extractorRef.current.extractPatternManual(
          image,
          selectionRegion
        );
        setExtractedPattern(pattern);
      } catch (error) {
        console.error('提取失败:', error);
        alert('图案提取失败，请重试');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const drawSelection = (canvas, region) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(region.x, region.y, region.width, region.height);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(region.x, region.y, region.width, region.height);
  };

  const handleContinue = () => {
    if (extractedPattern) {
      onPatternExtracted(extractedPattern);
    }
  };

  return (
    <div className="extractor-container">
      <div className="extractor-card">
        <div className="step-header">
          <h2 className="step-title">步骤 3: 提取印花图案</h2>
          <button className="back-button" onClick={onBack}>
            ← 返回
          </button>
        </div>

        <div className="mode-selector">
          <button
            className={`mode-button ${extractionMode === 'auto' ? 'active' : ''}`}
            onClick={() => {
              setExtractionMode('auto');
              setExtractedPattern(null);
              setSelectionRegion(null);
            }}
          >
            自动提取
          </button>
          <button
            className={`mode-button ${extractionMode === 'manual' ? 'active' : ''}`}
            onClick={() => {
              setExtractionMode('manual');
              setExtractedPattern(null);
              setSelectionRegion(null);
            }}
          >
            手动选择
          </button>
        </div>

        <div className="extraction-area">
          <div className="image-panel">
            <h3>服装图片</h3>
            <canvas
              ref={canvasRef}
              className="extraction-canvas"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{ cursor: extractionMode === 'manual' ? 'crosshair' : 'default' }}
            />
            {extractionMode === 'auto' && (
              <button
                className="extract-button"
                onClick={handleAutoExtract}
                disabled={isProcessing}
              >
                {isProcessing ? '提取中...' : '自动提取图案'}
              </button>
            )}
            {extractionMode === 'manual' && (
              <p className="hint-text">在图片上拖拽选择图案区域</p>
            )}
          </div>

          {extractedPattern && (
            <div className="image-panel">
              <h3>提取的图案</h3>
              <img
                src={extractedPattern.src}
                alt="提取的图案"
                className="extracted-pattern"
              />
              <button className="continue-button" onClick={handleContinue}>
                继续生成四方连续 →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatternExtractorComponent;
