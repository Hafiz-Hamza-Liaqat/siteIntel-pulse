"use client";

import React, { useState, useEffect } from "react";
import {
  PieChart,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Link2,
  ExternalLink,
  Shield,
  Activity,
  Check,
  RefreshCw,
} from "lucide-react";
import type { IntegrationDiagnostic } from "@/types";
import { ProviderConnectionState } from "@/lib/providers/types";

interface IntegrationsViewProps {
  integrations: IntegrationDiagnostic[];
}

export function IntegrationsView({ integrations }: IntegrationsViewProps) {
  const [providerStates, setProviderStates] = useState<ProviderConnectionState[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/providers/status");
      if (res.ok) {
        const data = await res.json();
        if (data?.providers) {
          setProviderStates(data.providers);
        }
      }
    } catch {}
  };

  const handleConnect = async (provider: string) => {
    setActionError(null);

    let shopDomain: string | undefined = undefined;
    if (provider === "commerce_shopify") {
      const input = window.prompt("Enter your Shopify store domain (e.g. my-store.myshopify.com):");
      if (!input || !input.trim()) {
        return;
      }
      shopDomain = input.trim();
    }

    setLoading(true);
    try {
      const res = await fetch("/api/providers/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, ...(shopDomain ? { shopDomain } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to start connection.");
      } else if (data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.success) {
        await fetchProviders();
      }
    } catch (err: any) {
      setActionError(err?.message || "Connection request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/providers/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (res.ok) {
        await fetchProviders();
      }
    } catch {}
    setLoading(false);
  };

  const handleSelectGA4Property = async () => {
    const propInput = window.prompt("Enter Google Analytics 4 Property ID (e.g. properties/123456789 or 123456789):");
    if (!propInput || !propInput.trim()) return;

    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/providers/ga4/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: propInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to select GA4 property.");
      } else {
        await fetchProviders();
      }
    } catch (err: any) {
      setActionError(err?.message || "Property selection request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGoogleAdsCustomer = async () => {
    const customerInput = window.prompt(
      "Enter Google Ads Customer ID (e.g. customers/123-456-7890 or 123-456-7890):"
    );
    if (!customerInput || !customerInput.trim()) return;

    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/providers/google-ads/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customerInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to select Google Ads customer account.");
      } else {
        await fetchProviders();
      }
    } catch (err: any) {
      setActionError(err?.message || "Customer selection request failed.");
    } finally {
      setLoading(false);
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case "BEHAVIOR_VERIFIED":
      case "LOAD_OBSERVED":
      case "DETECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            DETECTED
          </span>
        );
      case "CONSENT_DEPENDENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3 h-3" />
            CONSENT GATED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3 h-3" />
            NOT DETECTED
          </span>
        );
    }
  };

  const getStatusBadge = (provider: ProviderConnectionState) => {
    if (provider.status === "CONNECTED") {
      if (
        provider.healthStatus === "DEGRADED" ||
        (provider.provider === "google_analytics_4" && !provider.propertyId) ||
        (provider.provider === "ads_google" && !provider.accountId)
      ) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3 h-3" />
            SETUP REQUIRED
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <Check className="w-3 h-3" />
          CONNECTED
        </span>
      );
    }
    if (provider.status === "NOT_CONFIGURED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
          NOT CONFIGURED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
        NOT CONNECTED
      </span>
    );
  };

  return (
    <section id="section-analytics" className="space-y-8">
      {/* 1. Authorized API & Provider Connections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Authorized Business Data Connections</h2>
              <p className="text-xs text-brand-textMuted">
                Secure OAuth 2.0 connectors for GA4, Search Console, CRM, and Commerce data ingestion (Cost of Inaction v2)
              </p>
            </div>
          </div>
          <button
            onClick={fetchProviders}
            className="p-1.5 text-xs text-slate-400 hover:text-white rounded-lg bg-brand-surface border border-brand-borderSubtle hover:bg-brand-card transition flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {actionError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providerStates.map((p) => (
            <div
              key={p.provider}
              className="p-4 rounded-xl border border-brand-border bg-brand-card hover:border-brand-borderHover transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{p.displayName}</span>
                  {getStatusBadge(p)}
                </div>

                <p className="text-[11px] text-brand-textMuted leading-relaxed">
                  {p.statusMessage}
                </p>

                {p.supportedCapabilities && p.supportedCapabilities.length > 0 && (
                  <div className="pt-2 border-t border-brand-border/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Supported Metrics
                    </span>
                    <ul className="text-[10px] text-brand-textMuted space-y-0.5">
                      {p.supportedCapabilities.slice(0, 3).map((cap, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-brand-cyan" />
                          <span>{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-brand-border/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  {p.lastSyncAt ? `Synced ${new Date(p.lastSyncAt).toLocaleDateString()}` : "No active sync"}
                </span>
                {p.isConnected ? (
                  <div className="flex items-center gap-2">
                    {p.provider === "google_analytics_4" && (
                      <button
                        onClick={handleSelectGA4Property}
                        disabled={loading}
                        className="px-2 py-1 text-[10px] font-semibold text-brand-cyan hover:text-white bg-brand-cyan/10 hover:bg-brand-cyan/20 rounded-md border border-brand-cyan/30 transition disabled:opacity-50"
                      >
                        {p.propertyId ? "Change Property" : "Select Property"}
                      </button>
                    )}
                    {p.provider === "ads_google" && (
                      <button
                        onClick={handleSelectGoogleAdsCustomer}
                        disabled={loading}
                        className="px-2 py-1 text-[10px] font-semibold text-brand-cyan hover:text-white bg-brand-cyan/10 hover:bg-brand-cyan/20 rounded-md border border-brand-cyan/30 transition disabled:opacity-50"
                      >
                        {p.accountId ? "Change Customer" : "Select Customer"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnect(p.provider)}
                      disabled={loading}
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-md border border-rose-500/30 transition disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(p.provider)}
                    disabled={loading || p.status === "NOT_CONFIGURED"}
                    className="px-2.5 py-1 text-[11px] font-semibold text-brand-cyan hover:text-white bg-brand-cyan/10 hover:bg-brand-cyan/20 rounded-md border border-brand-cyan/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {p.status === "NOT_CONFIGURED" ? "Not Configured" : "Connect"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Detected On-Page Scripts & Tag Integrations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Detected On-Page Scripts &amp; CMP Signals</h2>
              <p className="text-xs text-brand-textMuted">
                DOM measurement clues, container loaders, marketing pixels, and privacy CMP detections
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-brand-border bg-brand-card hover:border-brand-borderHover transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{item.name}</span>
                {getStateBadge(item.state)}
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-brand-textMuted">
                  <span>Category:</span>
                  <span className="font-semibold text-slate-300 uppercase text-[10px]">
                    {item.category}
                  </span>
                </div>

                {item.detectedClues && item.detectedClues.length > 0 && (
                  <div className="flex items-center justify-between text-brand-textMuted">
                    <span>Detected Clue:</span>
                    <span className="font-mono text-brand-cyan font-bold truncate max-w-xs">
                      {item.detectedClues[0]}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-brand-border/60 text-[11px] text-brand-textMuted leading-relaxed">
                {item.notes}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
