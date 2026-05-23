"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ReferralResponse = {
  referralCode?: string;
  referralLink?: string;
  error?: string;
};

type RedeemResponse = {
  ok?: boolean;
  reason?: string;
  error?: string;
};

export function ReferralCard() {
  const [loadingLink, setLoadingLink] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReferralLink = async () => {
    setLoadingLink(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/referrals");
      const data = (await response.json()) as ReferralResponse;

      if (!response.ok) {
        setError(data.error ?? "Could not load referral link.");
        return;
      }

      setReferralCode(data.referralCode ?? null);
      setReferralLink(data.referralLink ?? null);
      setMessage("Referral link is ready.");
    } catch {
      setError("Network error while loading referral link.");
    } finally {
      setLoadingLink(false);
    }
  };

  const redeemReferral = async () => {
    const code = redeemCode.trim();
    if (!code) {
      setError("Enter a referral code to redeem.");
      return;
    }

    setRedeeming(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/referrals/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as RedeemResponse;

      if (!response.ok || !data.ok) {
        if (data.reason === "already_redeemed") {
          setError("Referral already used on this account.");
        } else if (data.reason === "self_referral_not_allowed") {
          setError("You cannot redeem your own referral code.");
        } else if (data.reason === "invalid_code") {
          setError("Invalid referral code.");
        } else {
          setError(data.error ?? "Could not redeem this referral code.");
        }
        return;
      }

      setMessage("Referral redeemed. Pro credits were applied.");
      setRedeemCode("");
    } catch {
      setError("Network error while redeeming referral.");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referrals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Invite another business and both accounts receive Pro credits.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={loadReferralLink}
            disabled={loadingLink}
          >
            {loadingLink ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Get my referral link"
            )}
          </Button>
          {referralCode ? (
            <p className="text-sm">
              Code: <span className="font-medium">{referralCode}</span>
            </p>
          ) : null}
          {referralLink ? (
            <p className="break-all text-xs text-muted-foreground">
              {referralLink}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="redeem-code">Redeem a referral code</Label>
          <div className="flex gap-2">
            <Input
              id="redeem-code"
              value={redeemCode}
              onChange={(event) => setRedeemCode(event.target.value)}
              placeholder="Enter code"
            />
            <Button type="button" onClick={redeemReferral} disabled={redeeming}>
              {redeeming ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Redeeming...
                </>
              ) : (
                "Redeem"
              )}
            </Button>
          </div>
        </div>

        {message ? (
          <p className="rounded border border-success/40 bg-success/10 p-2 text-sm text-success">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded border border-error/40 bg-error/10 p-2 text-sm text-error">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

