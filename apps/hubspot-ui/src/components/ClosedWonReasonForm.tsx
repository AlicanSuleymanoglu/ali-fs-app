import React, { useState } from 'react';
import { Button } from "./ui/button.tsx";
import { Label } from "./ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select.tsx";
import { Input } from "./ui/input.tsx";
import { toast } from "sonner";


interface ClosedWonReasonFormProps {
  dealId: string; // Make sure you pass the correct dealId!
  onComplete: () => void;
}

const ClosedWonReasonForm: React.FC<ClosedWonReasonFormProps> = ({ dealId, onComplete }) => {
  const [reason, setReason] = useState<string>("");
  const [posCompetitor, setPosCompetitor] = useState<string>("");
  const [paymentCompetitor, setPaymentCompetitor] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dealId) {
      toast.error("No Deal ID found! Cannot update deal.");
      return;
    }

    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/deal/${dealId}/close-won`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closed_won_reason: reason,
          pos_competitor: posCompetitor,
          payment_competitor: paymentCompetitor,
        }),
      });

      if (!res.ok) throw new Error("Failed to update deal");

      toast.success("Deal marked as won with reason!");
      setLoading(false);
      onComplete();
    } catch (err) {
      toast.error("Failed to update deal");
      setLoading(false);
      console.error(err);
    }
  };

  // ...rest of your form UI is the same, just make sure the form uses handleSubmit!
  return (
    <div className="allo-card w-full">
      <h2 className="text-xl font-semibold mb-6">Closed Won Reason</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ... all your inputs/selects ... */}
        <div className="space-y-4">
          {/* Reason select */}
          <div className="space-y-2">
            <Label htmlFor="closed-won-reason">Reason <span className="text-red-500">*</span></Label>
            <Select
              onValueChange={setReason}
              value={reason}
              disabled={loading}
            >
              <SelectTrigger id="closed-won-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Specific Features">Specific Features</SelectItem>
                <SelectItem value="Attractive Pricing">Attractive Pricing</SelectItem>
                <SelectItem value="Sales Manager Skills">Sales Manager Skills</SelectItem>
                <SelectItem value="Integrated Payment">Integrated Payment</SelectItem>
                <SelectItem value="Integrations">Integrations</SelectItem>
                <SelectItem value="allO Go">allO Go</SelectItem>
                <SelectItem value="Invoice Tool">Invoice Tool</SelectItem>
                <SelectItem value="Recommendation from Existing Partner">Recommendation from Existing Partner</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* POS Competitor */}
          <div className="space-y-2">
            <Label htmlFor="pos-competitor">POS Competitor</Label>
            <Select
              onValueChange={setPosCompetitor}
              value={posCompetitor}
              disabled={loading}
            >
              <SelectTrigger id="pos-competitor">
                <SelectValue placeholder="Select a POS competitor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Aaden">Aaden</SelectItem>
                <SelectItem value="Acomtec">Acomtec</SelectItem>
                <SelectItem value="Flatpay">Flatpay</SelectItem>
                <SelectItem value="Flysoft">Flysoft</SelectItem>
                <SelectItem value="Revel">Revel</SelectItem>
                <SelectItem value="Gastronovi">Gastronovi</SelectItem>
                <SelectItem value="Hello Tess">Hello Tess</SelectItem>
                <SelectItem value="Hypersoft">Hypersoft</SelectItem>
                <SelectItem value="Lightspeed">Lightspeed</SelectItem>
                <SelectItem value="Luca">Luca</SelectItem>
                <SelectItem value="Orderbird">Orderbird</SelectItem>
                <SelectItem value="Procomsys">Procomsys</SelectItem>
                <SelectItem value="Ready 2 Order">Ready 2 Order</SelectItem>
                <SelectItem value="RPOS">RPOS</SelectItem>
                <SelectItem value="Sides (Simple Delivery)">Sides (Simple Delivery)</SelectItem>
                <SelectItem value="Star">Star</SelectItem>
                <SelectItem value="SumUp">SumUp</SelectItem>
                <SelectItem value="ThomasBui">ThomasBui</SelectItem>
                <SelectItem value="Vectron">Hypersoft</SelectItem>
                <SelectItem value="WinOrder">WinOrder</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
                <SelectItem value="None">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Payment Competitor */}
          <div className="space-y-2">
            <Label htmlFor="payment-competitor">Payment Competitor</Label>
            <Select
              onValueChange={setPaymentCompetitor}
              value={paymentCompetitor}
              disabled={loading}
            >
              <SelectTrigger id="payment-competitor">
                <SelectValue placeholder="Select a payment competitor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Adyen">Adyen</SelectItem>
                <SelectItem value="bluepos">bluepos</SelectItem>
                <SelectItem value="Dish">Dish</SelectItem>
                <SelectItem value="ECOS">ECOS</SelectItem>
                <SelectItem value="Flatpay">Flatpay</SelectItem>
                <SelectItem value="Foodmato">Foodmato</SelectItem>
                <SelectItem value="Gastronovi">Gastronovi</SelectItem>
                <SelectItem value="Gewinnblick">Gewinnblick</SelectItem>
                <SelectItem value="hobex">hobex</SelectItem>
                <SelectItem value="Hypersoft">Hypersoft</SelectItem>
                <SelectItem value="iZettle">iZettle</SelectItem>
                <SelectItem value="Leaf Systems">Leaf Systems</SelectItem>
                <SelectItem value="Lightspeed">Lightspeed</SelectItem>
                <SelectItem value="Luca">Luca</SelectItem>
                <SelectItem value="Nexi">Nexi</SelectItem>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Orderbird">Orderbird</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
                <SelectItem value="Payjet">Payjet</SelectItem>
                <SelectItem value="Payone">Payone</SelectItem>
                <SelectItem value="REA Card">REA Card</SelectItem>
                <SelectItem value="ready2order">ready2order</SelectItem>
                <SelectItem value="Sides">Sides</SelectItem>
                <SelectItem value="Sparkasse">Sparkasse</SelectItem>
                <SelectItem value="SumUp">SumUp</SelectItem>
                <SelectItem value="Sunday">Sunday</SelectItem>
                <SelectItem value="Unzer">Unzer</SelectItem>
                <SelectItem value="Vectron">Vectron</SelectItem>
                <SelectItem value="Vert">Vert</SelectItem>
                <SelectItem value="VR Bank">VR Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Button type="submit" className="allo-button" disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ClosedWonReasonForm;
