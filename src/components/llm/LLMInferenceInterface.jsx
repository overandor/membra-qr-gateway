import React, { useState, useEffect } from 'react';
import { useWallet } from '../../context/WalletContext';
import { 
  MessageSquare, 
  Coins, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  GitBranch,
  Shield,
  Loader2,
  Send,
  ChevronDown,
  Eye,
  Copy,
} from 'lucide-react';

const LLMInferenceInterface = () => {
  const { publicKey, connected } = useWallet();
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [maxTokens, setMaxTokens] = useState(1000);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(1.0);
  
  const [tokenization, setTokenization] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [proofCapsule, setProofCapsule] = useState(null);
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showProof, setShowProof] = useState(false);

  const models = [
    { id: 'gpt-4', name: 'GPT-4', price: 100 },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', price: 20 },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', price: 120 },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', price: 40 },
    { id: 'llama-2-70b', name: 'Llama 2 70B', price: 10 },
    { id: 'llama-2-13b', name: 'Llama 2 13B', price: 5 },
    { id: 'mistral-7b', name: 'Mistral 7B', price: 3 },
  ];

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    }
  }, [connected, publicKey]);

  useEffect(() => {
    if (prompt.length > 0) {
      tokenizePrompt();
    }
  }, [prompt, selectedModel]);

  const fetchBalance = async () => {
    try {
      const res = await fetch(`/api/llm/balance/${publicKey.toString()}`);
      const data = await res.json();
      setBalance(parseFloat(data.balance) || 0);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const tokenizePrompt = async () => {
    try {
      const res = await fetch('/api/llm/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, modelId: selectedModel }),
      });
      const data = await res.json();
      setTokenization(data.tokenization);
      
      // Get cost estimate
      const estRes = await fetch('/api/llm/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          modelId: selectedModel,
          maxTokens,
          temperature,
          topP,
        }),
      });
      const estData = await estRes.json();
      setEstimate(estData.estimate);
    } catch (error) {
      console.error('Tokenization error:', error);
    }
  };

  const handleSubmit = async () => {
    if (!connected) {
      alert('Please connect your wallet');
      return;
    }

    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setLoading(true);
    setResponse(null);
    setProofCapsule(null);

    try {
      // Submit inference request
      const submitRes = await fetch('/api/llm/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          prompt,
          modelId: selectedModel,
          parameters: JSON.stringify({ maxTokens, temperature, topP }),
          metadataUri: `ipfs://prompt-${Date.now()}`,
        }),
      });
      const submitData = await submitRes.json();

      if (!submitData.success) {
        throw new Error('Failed to submit inference request');
      }

      // Simulate LLM response (in production, this would call actual LLM API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResponse = `This is a simulated response from ${selectedModel}. In production, this would be the actual LLM output based on your prompt: "${prompt.substring(0, 50)}..."`;
      
      // Record response
      const recordRes = await fetch('/api/llm/record-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inferenceRequest: submitData.inferenceRequest,
          responseText: mockResponse,
          modelId: selectedModel,
          tokenCount: estimate?.requiredTokens || 100,
        }),
      });
      const recordData = await recordRes.json();

      setResponse({
        text: mockResponse,
        inferenceResponse: recordData.inferenceResponse,
        responseHash: recordData.responseHash,
        merkleRoot: recordData.merkleRoot,
        tokenCount: recordData.tokenCount,
      });

      // Generate proof capsule
      const proofRes = await fetch('/api/llm/generate-proof-capsule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inferenceResponse: recordData.responseHash,
          commitHash: 'mock-commit-' + Date.now(),
          repository: 'membra/llm-inference-proofs',
          filePath: 'proofs.json',
          merkleRoot: recordData.merkleRoot,
        }),
      });
      const proofData = await proofRes.json();

      setProofCapsule(proofData.proofCapsule);
      
      // Refresh balance
      fetchBalance();

    } catch (error) {
      console.error('Inference error:', error);
      alert('Failed to complete inference: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const sufficientBalance = estimate && balance >= estimate.estimatedCost;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary-orange" />
            LLM Inference Layer
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-background-100 rounded-lg px-4 py-2">
              <Coins className="w-5 h-5 text-primary-gold" />
              <span className="font-semibold">{balance.toFixed(2)} Tokens</span>
            </div>
            {!connected && (
              <div className="flex items-center gap-2 text-danger">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">Wallet not connected</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-text-muted">
          Submit prompts for LLM inference with on-chain proof verification. Responses are recorded as transactions with Merkle tree proofs.
        </p>
      </div>

      {/* Model Selection */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary-orange" />
          Model Selection
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={`p-4 rounded-xl border transition-all ${
                selectedModel === model.id
                  ? 'bg-primary-orange/10 border-primary-orange/30'
                  : 'bg-background-100 border-white/5 hover:border-primary-orange/20'
              }`}
            >
              <div className="text-sm font-medium mb-1">{model.name}</div>
              <div className="text-xs text-text-muted">{model.price} tokens/1K</div>
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Input */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-orange" />
          Prompt
        </h3>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          className="w-full h-32 bg-background-100 border border-white/10 rounded-lg p-4 text-sm resize-none focus:outline-none focus:border-primary-orange/30"
          disabled={!connected}
        />
        
        {/* Tokenization Info */}
        {tokenization && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-background-100">
              <div className="text-xs text-text-muted mb-1">Token Count</div>
              <div className="font-semibold">{tokenization.tokenCount}</div>
            </div>
            <div className="p-3 rounded-lg bg-background-100">
              <div className="text-xs text-text-muted mb-1">Complexity Score</div>
              <div className="font-semibold">{tokenization.complexityScore.toFixed(3)}</div>
            </div>
            <div className="p-3 rounded-lg bg-background-100">
              <div className="text-xs text-text-muted mb-1">Base Cost</div>
              <div className="font-semibold">{tokenization.baseCost}</div>
            </div>
            <div className="p-3 rounded-lg bg-background-100">
              <div className="text-xs text-text-muted mb-1">Total Cost</div>
              <div className="font-semibold text-primary-orange">{tokenization.totalCost} tokens</div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Parameters */}
      <div className="glass-card p-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium mb-4"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          Advanced Parameters
        </button>
        
        {showAdvanced && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-muted mb-2 block">Max Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full bg-background-100 border border-white/10 rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-text-muted mb-2 block">Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full bg-background-100 border border-white/10 rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-text-muted mb-2 block">Top P</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full bg-background-100 border border-white/10 rounded-lg p-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Cost Estimate */}
      {estimate && (
        <div className={`glass-card p-6 ${sufficientBalance ? 'border-success/30' : 'border-danger/30'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {sufficientBalance ? (
                <CheckCircle className="w-6 h-6 text-success" />
              ) : (
                <AlertCircle className="w-6 h-6 text-danger" />
              )}
              <div>
                <div className="font-semibold">
                  Estimated Cost: {estimate.estimatedCost} tokens
                </div>
                <div className="text-sm text-text-muted">
                  Your balance: {balance.toFixed(2)} tokens
                </div>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || !connected || !sufficientBalance}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-orange text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-orange/90 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Inference
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Response
            </h3>
            <button
              onClick={() => setShowProof(!showProof)}
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Shield className="w-4 h-4" />
              {showProof ? 'Hide' : 'Show'} Proof
            </button>
          </div>
          
          <div className="bg-background-100 rounded-lg p-4 mb-4">
            <p className="text-sm">{response.text}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-background-100">
              <div className="text-xs text-text-muted mb-1">Response Hash</div>
              <div className="font-mono text-xs">{response.responseHash.substring(0, 16)}...</div>
            </div>
            <div className="p-3 rounded-lg bg-background-100">
              <div className="text-xs text-text-muted mb-1">Token Count</div>
              <div className="font-semibold">{response.tokenCount}</div>
            </div>
          </div>

          {showProof && proofCapsule && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Proof Capsule
                </h4>
                <button
                  onClick={() => copyToClipboard(proofCapsule)}
                  className="flex items-center gap-2 text-sm text-primary-orange"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
              <pre className="bg-background-100 rounded-lg p-4 text-xs overflow-x-auto">
                {JSON.stringify(JSON.parse(proofCapsule), null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LLMInferenceInterface;
