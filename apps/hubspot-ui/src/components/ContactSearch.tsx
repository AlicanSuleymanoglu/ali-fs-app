import React, { useState, useEffect } from 'react';
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
import { Button } from "../components/ui/button.tsx";
import { Search, Plus, User } from 'lucide-react';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog.tsx";

export interface Contact {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyId?: string;
}

interface ContactSearchProps {
  onSelect: (contact: Contact) => void;
  value?: Contact | null;
  selectedCompany?: { id: string; name: string } | null;
  disabled?: boolean;
}

const ContactSearch: React.FC<ContactSearchProps> = ({
  onSelect,
  value,
  selectedCompany,
  disabled
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";
  const [newContact, setNewContact] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (value) setSearchTerm(value.fullName || '');
  }, [value]);

  useEffect(() => {
    if (selectedCompany) {
      const domain = selectedCompany.name
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
      setNewContact(prev => ({
        ...prev,
        email: `dummy@${domain}.de`
      }));
    }
  }, [selectedCompany]);

  const searchContacts = async (term: string) => {
    if (!selectedCompany || !term || term.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/contacts/search?q=${encodeURIComponent(term)}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to search contacts");

      const data = await res.json();
      setSearchResults(data.results);
      setShowResults(data.results?.length > 0);
    } catch (error) {
      console.error("Error searching contacts:", error);
      toast.error("Failed to search contacts");
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    searchContacts(term);
  };

  const selectContact = async (contact: Contact) => {
    onSelect(contact);

    if (selectedCompany) {
      try {
        const res = await fetch(`${BASE_URL}/api/companies/${selectedCompany.id}/associate-contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ contactId: contact.id }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          toast.success('Contact associated with the company!');
        } else {
          toast.error('Failed to associate contact.');
        }
      } catch (err) {
        console.error('Association error:', err);
        toast.error('Error associating contact.');
      }
    }
  };

  const handleSelectContact = (contact: Contact) => {
    selectContact(contact);
  };


  const handleAddContact = () => setShowAddDialog(true);

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true; // Empty phone is allowed
    const phoneRegex = /^\+49\d{9,11}$/;
    return phoneRegex.test(phone);
  };

  const handleNewContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewContact(prev => ({ ...prev, [name]: value }));

    if (name === 'phone') {
      if (!value) {
        setPhoneError(null);
      } else if (!validatePhoneNumber(value)) {
        setPhoneError('Phone number must start with +49 followed by 9-11 digits');
      } else {
        setPhoneError(null);
      }
    }
  };

  const handleSubmitNewContact = async (e: React.FormEvent) => {
    e.preventDefault();

    const { firstName, lastName, email, phone } = newContact;
    if (!firstName || !lastName || !email) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (phone && !validatePhoneNumber(phone)) {
      toast.error("Please enter a valid German phone number starting with +49");
      return;
    }

    try {
      const payload = {
        firstName,
        lastName,
        email,
        phone,
        companyId: selectedCompany?.id || null
      };

      const res = await fetch(`${BASE_URL}/api/hubspot/contact/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create contact");
      const contact = await res.json();

      if (selectedCompany?.id) {
        const assocRes = await fetch(`${BASE_URL}/api/companies/${selectedCompany.id}/associate-contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ contactId: contact.id }),
        });

        if (!assocRes.ok) {
          throw new Error("Failed to associate contact with company");
        }
      }

      // ✅ Set the selected contact and close dialog
      const fullName = `${contact.firstName} ${contact.lastName}`;
      await selectContact({ ...contact, fullName });
      setSearchTerm(fullName);
      setShowAddDialog(false);
      toast.success("Contact created and associated!");
    } catch (error) {
      console.error("❌ Error creating or associating contact:", error);
      toast.error("Failed to create or associate contact");
    }
  };

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="contact">Contact Name</Label>
      <div className="relative">
        <Input
          id="contact"
          placeholder={selectedCompany ? "Search for a contact..." : "Select a company first"}
          value={searchTerm}
          onChange={handleInputChange}
          disabled={disabled || !selectedCompany}
          className="pl-9"
          onFocus={() => {
            if (searchTerm.trim().length >= 2) {
              setShowResults(true);
              searchContacts(searchTerm);
            }
          }}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {searchResults.map((contact) => (
            <div
              key={contact.id}
              className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
              onClick={() => handleSelectContact(contact)}
            >
              <div className="font-medium">{contact.fullName}</div>
              <div className="text-sm text-gray-500">{contact.email}</div>
            </div>
          ))}
        </div>
      )}

      <div
        className="mt-2 text-blue-600 cursor-pointer flex items-center"
        onClick={handleAddContact}
      >
        <Plus size={16} className="mr-2" />
        Add a new contact
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Add New Contact for {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitNewContact} className="space-y-4 py-4">
            <div className="grid gap-4">
              <Input
                placeholder="First Name"
                name="firstName"
                value={newContact.firstName}
                onChange={handleNewContactChange}
                required
              />
              <Input
                placeholder="Last Name"
                name="lastName"
                value={newContact.lastName}
                onChange={handleNewContactChange}
                required
              />
              <Input
                placeholder="Email Address"
                name="email"
                value={newContact.email}
                onChange={handleNewContactChange}
                required
              />
              <div className="space-y-1">
                <Input
                  placeholder="Phone (+49XXXXXXXXXX)"
                  name="phone"
                  value={newContact.phone}
                  onChange={handleNewContactChange}
                  className={phoneError ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {phoneError && (
                  <p className="text-sm text-red-500">{phoneError}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit">Add Contact</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactSearch;
