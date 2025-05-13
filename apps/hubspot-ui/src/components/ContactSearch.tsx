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
  mobilePhone?: string;
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
  const [newContact, setNewContact] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobilePhone: '',
  });

  useEffect(() => {
    if (value) setSearchTerm(value.fullName || '');
  }, [value]);

  const searchContacts = async (term: string) => {
    if (!selectedCompany || !term || term.length < 2) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(term)}`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to search contacts");

      const data = await res.json();
      setSearchResults(data.results);
    } catch (error) {
      console.error("Error searching contacts:", error);
      toast.error("Failed to search contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    searchContacts(term);
  };

  const handleSelectContact = (contact: Contact) => {
    onSelect(contact);
    setSearchTerm(contact.fullName);
  };

  const handleAddContact = () => {
    setShowAddDialog(true);
  };

  const handleNewContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewContact((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitNewContact = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newContact.firstName || !newContact.lastName || !newContact.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const fullName = `${newContact.firstName} ${newContact.lastName}`;
      const createdContact: Contact = {
        id: `new-${Date.now()}`,
        fullName,
        ...newContact,
        companyId: selectedCompany?.id,
      };

      onSelect(createdContact);
      setSearchTerm(fullName);
      setShowAddDialog(false);
      toast.success("Contact added successfully");
    } catch (error) {
      console.error("Error adding contact:", error);
      toast.error("Failed to add contact");
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
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {searchResults.length > 0 && (
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
              <Input placeholder="First Name" name="firstName" onChange={handleNewContactChange} required />
              <Input placeholder="Last Name" name="lastName" onChange={handleNewContactChange} required />
              <Input placeholder="Email Address" name="email" onChange={handleNewContactChange} required />
              <Input placeholder="Phone (optional)" name="phone" onChange={handleNewContactChange} />
              <Input placeholder="Mobile Phone (optional)" name="mobilePhone" onChange={handleNewContactChange} />
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
