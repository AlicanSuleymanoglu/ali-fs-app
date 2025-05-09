import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
import { Search, Plus, User } from 'lucide-react';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog.tsx";
import { Button } from "../components/ui/button.tsx";
import ContactSearch, { Contact } from './ContactSearch.tsx';

export interface Company {
  id: string;
  name: string;
  address: string;
  dealId?: string | null;
  contactId?: string | null;
}

interface CompanySearchProps {
  onSelect: (company: Company) => void;
  value?: Company | null;
  required?: boolean;
  onAddNewCompany?: () => void; // Add this new prop
}

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    return new Promise((resolve) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => resolve(func(...args)), waitFor);
    });
  };
}

const CompanySearch: React.FC<CompanySearchProps> = ({ onSelect, value, required = false, onAddNewCompany }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [showNoDealDialog, setShowNoDealDialog] = useState(false);
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [selectedCompanyForDialog, setSelectedCompanyForDialog] = useState<Company | null>(null);
  const [showAddCompanyDialog, setShowAddCompanyDialog] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    street: '',
    city: '',
    postalCode: '',
    state: '',
    cuisine: '',
    fullAddress: ''
  });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Initialize Google Maps Autocomplete
  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load Google Maps JavaScript API script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initAutocomplete;
    document.body.appendChild(script);

    return () => {
      // Clean up script when component unmounts
      document.body.removeChild(script);
    };
  }, []);

  const initAutocomplete = () => {
    if (!addressInputRef.current || !globalThis.google?.maps?.places) return;

    const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current);
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;

      // Extract address components
      const addressComponents = place.address_components || [];

      let street = '';
      let city = '';
      let postalCode = '';
      let state = '';

      addressComponents.forEach((component: google.maps.GeocoderAddressComponent) => {
        const types = component.types;

        if (types.includes('street_number') || types.includes('route')) {
          street += component.long_name + ' ';
        }
        if (types.includes('locality')) {
          city = component.long_name;
        }
        if (types.includes('postal_code')) {
          postalCode = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
      });

      setNewCompany(prev => ({
        ...prev,
        street: street.trim(),
        city,
        postalCode,
        state,
        fullAddress: place.formatted_address || ''
      }));
    });
  };

  const searchCompanies = async (term: string) => {
    if (!term || term.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setShowResults(true);
    setError(null);

    try {
      const res = await fetch(`${BASE_URL}/api/companies/search?q=${encodeURIComponent(term)}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Search failed');
      }

      const data = await res.json();
      setSearchResults(data.results);
    } catch (err) {
      console.error('❌ Company search failed:', err);
      toast.error("Company search failed");
      setError("Search error");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useCallback(debounce(searchCompanies, 300), []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = (e.target as HTMLInputElement).value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

  const checkForContact = async (company: Company) => {
    try {
      const res = await fetch(`${BASE_URL}/api/hubspot/company/${company.id}/contacts`, {
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error("Failed to fetch contacts");
      }

      const contacts = await res.json();
      const firstContact = contacts[0];

      if (!firstContact) {
        // No contacts found, show contact search
        setSelectedCompanyForDialog(company);
        setShowContactSearch(true);
      } else {
        // Pass company with contactId
        onSelectRef.current({ ...company, contactId: firstContact.id || null });
      }
    } catch (err) {
      console.error("❌ Failed to fetch contacts:", err);
      toast.error("Could not fetch contacts for selected company.");
      onSelectRef.current({ ...company, contactId: null });
    }
  };

  const handleContactSearchSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setShowContactSearch(false);
    onSelectRef.current({ ...selectedCompanyForDialog, contactId: contact.id || '' });
  };

  const handleSelectCompany = async (company: Company) => {
    setSearchTerm(company.name);
    setShowResults(false);
    setSearchResults([]);
    setError(null);

    try {
      // First check for deals
      const dealRes = await fetch(`${BASE_URL}/api/hubspot/company/${company.id}/deals`, {
        credentials: 'include'
      });

      if (!dealRes.ok) {
        throw new Error("Failed to fetch deals");
      }

      const deals = await dealRes.json();
      const firstDeal = deals[0];
      const companyWithDeal = { ...company, dealId: firstDeal?.id || null };

      if (!firstDeal) {
        // No deals found, show dialog
        setSelectedCompanyForDialog(company);
        setShowNoDealDialog(true);
      } else {
        // Continue to check for contacts
        await checkForContact(companyWithDeal);
      }
    } catch (err) {
      console.error("❌ Failed to fetch deal:", err);
      toast.error("Could not fetch deal for selected company.");
      await checkForContact({ ...company, dealId: null });
    }
  };

  const handleCreateDeal = async () => {
    if (!selectedCompanyForDialog) return;

    try {
      const payload = {
        dealName: `${selectedCompanyForDialog.name} - New Deal`,
        pipeline: "default", // ✅ internal pipeline ID
        stage: "appointmentscheduled", // ✅ internal stage ID, not "Meeting Scheduled"
        companyId: selectedCompanyForDialog.id,
      };

      const res = await fetch(`${BASE_URL}/api/hubspot/deals/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed to create deal");
      }

      const newDeal = await res.json();
      toast.success("New deal created successfully");

      // Close dialog and check for contacts with the deal ID
      setShowNoDealDialog(false);
      await checkForContact({
        ...selectedCompanyForDialog,
        dealId: newDeal.id
      });
    } catch (err) {
      console.error("❌ Failed to create deal:", err);
      toast.error("Could not create new deal");
      // Still select the company but without a deal, and check for contacts
      setShowNoDealDialog(false);
      await checkForContact({ ...selectedCompanyForDialog, dealId: null });
    }
  };

  const handleAddNewCompanyClick = () => {
    if (onAddNewCompany) {
      // Use the new prop if provided
      onAddNewCompany();
    } else {
      // Default behavior
      setNewCompany({
        name: searchTerm,
        street: '',
        city: '',
        postalCode: '',
        state: '',
        cuisine: '',
        fullAddress: ''
      });
      setShowAddCompanyDialog(true);
    }
    setShowResults(false);
  };

  const handleNewCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setNewCompany(prev => ({
      ...prev,
      [name]: value
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
      // 1. Create company
      const companyPayload = {
        name: newCompany.name,
        street: newCompany.street,
        city: newCompany.city,
        postalCode: newCompany.postalCode,
        state: newCompany.state || 'N/A',
        cuisine: newCompany.cuisine,
      };

      const companyRes = await fetch(`${BASE_URL}/api/companies/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(companyPayload)
      });

      if (!companyRes.ok) {
        throw new Error("Failed to create company");
      }

      const company = await companyRes.json();

      // 2. Automatically create a deal for the new company
      const dealPayload = {
        dealName: `${company.name} - New Deal`,
        pipeline: "default", // pipeline ID
        stage: "appointmentscheduled", // stage ID
        companyId: company.id
      };

      const dealRes = await fetch(`${BASE_URL}/api/hubspot/deals/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dealPayload)
      });

      if (!dealRes.ok) {
        throw new Error("Failed to create deal for new company");
      }

      const deal = await dealRes.json();

      // 3. Prepare to check/create contact
      setShowAddCompanyDialog(false);

      // Prepare prefilled contact information for the new company
      const companyNameForEmail = company.name.toLowerCase().replace(/\s+/g, '');
      setSelectedContact({
        firstName: "Test",
        lastName: company.name,
        email: `test.${companyNameForEmail}@allo.com`,
        phone: '',
      });

      setSelectedCompanyForDialog({
        id: company.id,
        name: company.name,
        address: `${company.street}, ${company.city}, ${company.postalCode}`,
        dealId: deal.id
      });

      toast.success("Company created with new deal");

      // Show the contact creation dialog
      setShowContactSearch(true);
    } catch (err) {
      console.error("❌ Failed to create company:", err);
      toast.error("Could not create company");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (value) {
      setSearchTerm(value.name);
      setSearchResults([]);
      setShowResults(false);
    }
  }, [value]);

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="company-search">Company Name {required && <span className="text-red-500">*</span>}</Label>
      <div className="relative">
        <Input
          id="company-search"
          placeholder="Search companies..."
          value={searchTerm}
          onChange={handleInputChange}
          className="pl-9"
          onFocus={() => {
            if (searchTerm.trim().length >= 2 && searchResults.length > 0) {
              setShowResults(true);
            }
          }}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          required={required}
          autoComplete="off"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading && <div className="p-4 text-center text-sm text-gray-500">Searching...</div>}
          {!loading && error && <div className="p-4 text-center text-sm text-red-500">{error}</div>}
          {!loading && !error && searchResults.length > 0 && (
            <div>
              {searchResults.map((company) => (
                <div
                  key={company.id}
                  className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onMouseDown={() => handleSelectCompany(company)}
                >
                  <div className="font-medium">{company.name}</div>
                  <div className="text-sm text-gray-500">{company.address}</div>
                </div>
              ))}
            </div>
          )}
          {!loading && !error && searchResults.length === 0 && searchTerm.trim().length >= 2 && (
            <div>
              <div className="p-4 text-center text-sm text-gray-500">No matching companies found</div>
              <div
                className="p-3 hover:bg-gray-100 cursor-pointer border-t border-gray-100 flex items-center text-blue-600"
                onMouseDown={handleAddNewCompanyClick}
              >
                <Plus size={16} className="mr-2" />
                <span>Add "{searchTerm}" as new company</span>
              </div>
            </div>
          )}
        </div>
      )}

      {showContactSearch && (
        <ContactSearch
          onSelect={handleContactSearchSelect}
          selectedCompany={selectedCompanyForDialog}
          disabled={false}
        />
      )}

      {/* No Deal Dialog */}
      <Dialog open={showNoDealDialog} onOpenChange={setShowNoDealDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>No Deal Found</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              No deal was found for {selectedCompanyForDialog?.name}.
              Would you like to create a new deal with the following details?
            </p>
            <div className="space-y-2 text-sm border-l-2 border-gray-200 pl-3">
              <p><span className="font-medium">Deal Name:</span> {selectedCompanyForDialog?.name} - New Deal</p>
              <p><span className="font-medium">Pipeline:</span> Sales Pipeline</p>
              <p><span className="font-medium">Stage:</span> Meeting Scheduled</p>
              <p><span className="font-medium">Association:</span> {selectedCompanyForDialog?.name}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateDeal}>
              Create Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Company Dialog (adding this for test reasons) */}
      {/* Only render the dialog if we're using the internal add company flow */}
      {!onAddNewCompany && (
        <Dialog open={showAddCompanyDialog} onOpenChange={setShowAddCompanyDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Restaurant</DialogTitle>
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

              <div className="space-y-2">
                <Label htmlFor="company-address">Address <span className="text-red-500">*</span></Label>
                <Input
                  id="company-address"
                  placeholder="Search address..."
                  ref={addressInputRef}
                  className="mb-2"
                />

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="company-street">Street Address <span className="text-red-500">*</span></Label>
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
                <div className="grid grid-cols-2 gap-2">
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
                    <Input
                      id="company-state"
                      name="state"
                      value={newCompany.state}
                      onChange={handleNewCompanyChange}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-cuisine">Cuisine</Label>
                <Input
                  id="company-cuisine"
                  name="cuisine"
                  value={newCompany.cuisine}
                  onChange={handleNewCompanyChange}
                  placeholder="e.g. Italian, Mediterranean, American..."
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddCompanyDialog(false)}
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
      )}
    </div>
  );
};

export default CompanySearch;
