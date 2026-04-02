
import { useState, useCallback, useMemo } from 'react';
import { createAssistantChatSession } from '../services/geminiService';
import { getEposTransactionsSnapshot } from '../services/firestoreService';
import { Product, BranchData, BranchKey, Transfer } from '../types';
import { StockLogicReturn } from './useStockLogic';
import { PricingDeskReturn } from './usePricingDesk';
import { matchesAnySearchField, matchesSearchTerms } from '../utils/stringUtils';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export function useGeminiAssistant(
  logic: StockLogicReturn,
  pricingLogic: PricingDeskReturn,
  onOpenTransfer: (product: Product, quantity: number, type: 'send' | 'request') => void
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { branchData, currentBranch, sendMessage } = logic;

  // ─── Tool Executors ──────────────────────────────────────────────

  const executeTool = useCallback(async (call: any) => {
    const { name, args } = call;
    const inventory = branchData[currentBranch] || [];

    switch (name) {
      case 'get_inventory_stats': {
        const totalItems = inventory.length;
        const restockNeeded = inventory.filter(p => p.stockInHand < (p.stockToKeep * 0.50) && !p.isDiscontinued).length;
        const expiringCount = inventory.filter(p => {
          if (!p.expiryDate) return false;
          const exp = new Date(p.expiryDate).getTime();
          const diffDays = Math.ceil((exp - Date.now()) / (1000 * 3600 * 24));
          return diffDays <= 90;
        }).length;
        
        return {
          branch: currentBranch,
          totalItems,
          restockNeeded,
          expiringSoon: expiringCount,
          slowMovers: "Available via get_slow_movers tool"
        };
      }

      case 'search_inventory': {
        const query = args.query;
        const results = inventory.filter(p => 
          matchesAnySearchField([p.name, p.barcode, p.productCode], query)
        ).slice(0, 10); // Limit results for context window

        return results.map(p => ({
          name: p.name,
          barcode: p.barcode,
          stock: p.stockInHand,
          targetStock: p.stockToKeep,
          partPacks: p.partPacks,
          looseStockTarget: p.looseStockToKeep,
          price: p.price,
          location: p.location
        }));
      }

      case 'clinical_inventory_search': {
        const keywords = args.keywords as string[];
        if (!keywords || !Array.isArray(keywords)) return { error: "Invalid keywords array provided." };
        
        const results = inventory.filter(p => {
          const searchString = `${p.name} ${p.productCode} ${p.barcode}`.toLowerCase();
          return keywords.some(kw => searchString.includes(kw.toLowerCase()));
        }).slice(0, 30); // Allow up to 30 results for a comprehensive clinical check

        return results.map(p => ({
          name: p.name,
          stock: p.stockInHand,
          price: p.price,
          location: p.location,
          packSize: p.packSize
        }));
      }

      case 'check_price_alerts': {
        const alerts = pricingLogic.alerts.slice(0, 10);
        const labelsNeeded = inventory.filter(p => p.labelNeedsUpdate).length;
        return {
          activeAlertsCount: pricingLogic.alerts.length,
          labelsPendingCount: labelsNeeded,
          topAlerts: alerts.map(a => ({
            name: a.name,
            currentPrice: a.currentPrice,
            newPrice: a.newPrice,
            type: a.type
          }))
        };
      }

      case 'draft_transfer': {
        const query = args.productName;
        const product = inventory.find(p => matchesSearchTerms(p.name, query));
        
        if (!product) return { error: `Product "${args.productName}" not found in local inventory.` };

        // Trigger the UI form for user confirmation
        onOpenTransfer(product, args.quantity, args.targetBranch.toLowerCase() === 'broom' ? 'send' : 'request');

        return {
          status: "FORM_OPENED",
          product: { name: product.name, barcode: product.barcode },
          quantity: args.quantity,
          type: args.targetBranch,
          message: `I have opened the transfer form for ${args.quantity}x ${product.name}. Please review and click 'Send' or 'Request' to finalize.`
        };
      }

      case 'get_restock_suggestions': {
        const needsRestock = inventory.filter(p => p.stockInHand < (p.stockToKeep * 0.50) && !p.isDiscontinued);
        return needsRestock.slice(0, 15).map(p => ({
          name: p.name,
          currentStock: p.stockInHand,
          targetStock: p.stockToKeep,
          suggestedOrder: Math.max(0, p.stockToKeep - p.stockInHand),
          supplier: p.supplier
        }));
      }

      case 'send_branch_message': {
        sendMessage(args.message);
        return { success: true, target: currentBranch === 'bywood' ? 'Broom Road' : 'Bywood Ave' };
      }

      case 'generate_branch_snapshot': {
        const bywoodInventory = branchData.bywood || [];
        const broomInventory = branchData.broom || [];
        
        // Try fetching today's EPOS
        const todayStr = new Date().toISOString().split('T')[0];
        let eposSummary = "Could not fetch EPOS.";
        try {
          const eposTxs = await getEposTransactionsSnapshot(currentBranch);
          const todayTxs = eposTxs.filter(t => t.timestamp.startsWith(todayStr));
          const totalRevenue = todayTxs.reduce((sum, t) => sum + t.total, 0);
          eposSummary = `${todayTxs.length} transactions today, Total: £${totalRevenue.toFixed(2)}`;
        } catch (e) {
          console.error("Failed to fetch EPOS snapshot", e);
        }

        const pendingRequests = {
          bywood: (branchData.bywoodRequests || []).filter(r => r.status === 'pending').length,
          broom: (branchData.broomRequests || []).filter(r => r.status === 'pending').length
        };

        return {
          currentBranch,
          inventoryStats: {
            bywood: { totalItems: bywoodInventory.length },
            broom: { totalItems: broomInventory.length }
          },
          eposToday: eposSummary,
          pendingRequests
        };
      }

      case 'get_pending_requests': {
        return {
          bywoodRequests: (branchData.bywoodRequests || []).filter(r => r.status === 'pending').map(r => ({ item: r.itemName, customer: r.customerName })),
          broomRequests: (branchData.broomRequests || []).filter(r => r.status === 'pending').map(r => ({ item: r.itemName, customer: r.customerName }))
        };
      }

      default:
        return { error: `Tool ${name} not implemented.` };
    }
  }, [branchData, currentBranch, pricingLogic.alerts, sendMessage]);

  // ─── Chat Handling ───────────────────────────────────────────────

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = { role: 'user', parts: [{ text }] };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const chat = createAssistantChatSession([...messages]);
      console.log("[useGeminiAssistant] Sending user message:", text);
      let response = await chat.sendMessage({ message: text });

      // Handle recursive tool calls
      let iteration = 0;
      while (response?.candidates?.[0]?.content?.parts?.some((p: any) => p.functionCall) && iteration < 5) {
        iteration++;
        const modelContent = response.candidates[0].content;
        console.log(`[useGeminiAssistant] Assistant requested tool call (iter ${iteration}):`, modelContent);
        
        const toolParts = modelContent.parts.filter((p: any) => p.functionCall);
        
        const toolResponses = await Promise.all(toolParts.map(async (part: any) => {
          try {
            const result = await executeTool(part.functionCall);
            return {
              functionResponse: {
                name: part.functionCall.name,
                response: { result }
              }
            };
          } catch (toolError) {
            console.error(`[useGeminiAssistant] Tool execution failed for ${part.functionCall.name}:`, toolError);
            return {
              functionResponse: {
                name: part.functionCall.name,
                response: { error: "Internal tool execution failed" }
              }
            };
          }
        }));

        // Send tool responses back to Gemini
        console.log(`[useGeminiAssistant] Sending tool responses back (iter ${iteration}):`, toolResponses);
        response = await chat.sendMessage({ message: toolResponses }); 
      }

      if (!response) {
        throw new Error("No response received from chat session");
      }

      const modelText = response.text || "I'm sorry, I couldn't formulate a response. Please try rephrasing.";
      console.log("[useGeminiAssistant] Final assistant text:", modelText);
      
      setMessages(prev => [
        ...prev, 
        userMsg,
        { role: 'model', parts: [{ text: modelText }] }
      ]);
    } catch (error) {
      console.error("[useGeminiAssistant] Critical assistant error:", error);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "I'm sorry, I encountered an error processing your request. Please check your connection or try a different command." }] }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, executeTool]);

  const clearChat = useCallback(() => setMessages([]), []);

  return {
    messages,
    isOpen,
    setIsOpen,
    isLoading,
    handleSend,
    clearChat
  };
}
