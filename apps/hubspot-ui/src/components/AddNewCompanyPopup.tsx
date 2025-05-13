import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.tsx";
import { toast } from "sonner";

interface AddNewCompanyPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onCompanyCreated?: (companyData: any) => void;
}

const AddNewCompanyPopup: React.FC<AddNewCompanyPopupProps> = ({ isOpen, onClose, onCompanyCreated }) => {
    const [newCompany, setNewCompany] = useState({
        name: '',
        street: '',
        city: '',
        postalCode: '',
        state: '',
        cuisine: '',
        fullAddress: ''
    });

    const [loading, setLoading] = useState(false);
    const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";


    const [cuisineOptions] = useState([
        "African", "Burger", "Cafe", "Chinese",
        "Chinese - All you can eat", "Chinese - Hotpot", "Chinese - Malatang",
        "Döner", "Fine Dining", "French", "German", "German Wirtshaus",
        "Greek", "Healthy/Salad/Bowl", "Indian", "Italian", "Japanese",
        "Japanese - BBQ", "Japanese - Buffet", "Japanese - Sushi", "Korean", "Korean - BBQ",
        "Mediterranean", "Mexican", "Middle-Eastern", "Other", "Russian", "Steakhouse", "Tapas", "Thai", "Turkish", "Vietnamese"
    ]);

    // Add state options
    const stateOptions = [
        "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hessen",
        "Niedersachsen", "Mecklenburg-Vorpommern", "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen",
        "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen"
    ];

    const handleNewCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewCompany(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCuisineChange = (value: string) => {
        setNewCompany(prev => ({
            ...prev,
            cuisine: value
        }));
    };

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!newCompany.name || !newCompany.street || !newCompany.city || !newCompany.postalCode) {
            toast.error("Please fill in all required fields");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${BASE_URL}/api/companies/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // Make sure the user is authenticated
                body: JSON.stringify(newCompany),
            });

            if (!response.ok) {
                throw new Error("Failed to create company");
            }

            const data = await response.json();
            toast.success("Company created successfully");

            if (onCompanyCreated) {
                onCompanyCreated(data);
            }

            onClose();
        } catch (err) {
            console.error("❌ Error creating company:", err);
            toast.error("Failed to create company");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add New Restaurant!</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateCompany} className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="company-name">Restaurant Name <span className="text-red-500">*</span></Label>
                        <Input
                            id="company-name"
                            name="name"
                            value={newCompany.name}
                            onChange={handleNewCompanyChange}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="company-street">Street <span className="text-red-500">*</span></Label>
                            <Input
                                id="company-street"
                                name="street"
                                value={newCompany.street}
                                onChange={handleNewCompanyChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company-city">City <span className="text-red-500">*</span></Label>
                            <Input
                                id="company-city"
                                name="city"
                                value={newCompany.city}
                                onChange={handleNewCompanyChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="company-postal">Postal Code <span className="text-red-500">*</span></Label>
                            <Input
                                id="company-postal"
                                name="postalCode"
                                value={newCompany.postalCode}
                                onChange={handleNewCompanyChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company-state">State</Label>
                            <Select value={newCompany.state} onValueChange={(value) => setNewCompany(prev => ({ ...prev, state: value }))}>
                                <SelectTrigger id="company-state">
                                    <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                    {stateOptions.map(state => (
                                        <SelectItem key={state} value={state}>{state}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="company-cuisine">Cuisine</Label>
                        <Select value={newCompany.cuisine} onValueChange={handleCuisineChange}>
                            <SelectTrigger id="company-cuisine">
                                <SelectValue placeholder="Select cuisine type" />
                            </SelectTrigger>
                            <SelectContent>
                                {cuisineOptions.map(cuisine => (
                                    <SelectItem key={cuisine} value={cuisine}>{cuisine}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Restaurant"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddNewCompanyPopup;
