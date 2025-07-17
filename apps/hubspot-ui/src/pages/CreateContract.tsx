
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Save, Download, Printer, Check, Home, Mail, Plus, Minus } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
import { Checkbox } from "../components/ui/checkbox.tsx";
import { Textarea } from "../components/ui/textarea.tsx";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "../components/ui/dialog.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover.tsx";
import { toast } from "sonner";
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form.tsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import SignatureCanvas from 'react-signature-canvas';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible.tsx";
import { Separator } from "../components/ui/separator.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.tsx";

interface PackageOption {
  name: string;
  originalPrice: string;
  discountedPrice: string;
  features: string[];
  isTopSeller?: boolean;
}

interface ExtraOption {
  id: string;
  name: string;
}

interface PaymentOption {
  id: string;
  name: string;
  rates: {
    percentage: string;
    fee: string;
    type?: string;
  }
}

interface FreeHardwareItem {
  id: string;
  name: string;
  quantity: number;
}

// Form validation schema
const formSchema = z.object({
  companyName: z.string().min(1, "Firmenname ist erforderlich"),
  address: z.string().min(1, "Adresse ist erforderlich"),
  contactPerson: z.string().min(1, "Ansprechpartner ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  mobile: z.string().min(1, "Mobilnummer ist erforderlich"),
  alloBeratername: z.string().min(1, "allO Berater Name ist erforderlich"),
  expectedCardVolume: z.string().optional(),
  remarks: z.string().optional(),

  // SEPA fields
  accountHolder: z.string().optional(),
  accountAddress: z.string().optional(),
  iban: z.string().optional(),
  goLiveDate: z.string().optional(),

  signerName: z.string().optional(),
  signatureDate: z.string().optional(),
});

const CreateContract: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const contractRef = useRef<HTMLDivElement>(null);
  const signatureRef = useRef<SignatureCanvas>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string>("");
  const [countryCode, setCountryCode] = useState("+49");
  const [onboardingType, setOnboardingType] = useState<string>("");
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [promotionMonths, setPromotionMonths] = useState(3);
  const [editingPrices, setEditingPrices] = useState(false);
  const [additionalHardwareItem, setAdditionalHardwareItem] = useState<string>("");
  const [showAdditionalHardware, setShowAdditionalHardware] = useState(false);
  const [additionalHardwareQuantity, setAdditionalHardwareQuantity] = useState(1);

  // Get username from location state
  const username = location.state?.username || "";

  // Create form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      address: "",
      contactPerson: "",
      email: "",
      mobile: "",
      alloBeratername: username,
      expectedCardVolume: "",
      remarks: "",
      accountHolder: "",
      accountAddress: "",
      iban: "",
      goLiveDate: "",
      signerName: "",
      signatureDate: format(new Date(), 'yyyy-MM-dd'),
    },
    mode: "onChange", // This enables real-time validation
  });

  // Watch form fields for auto-fill
  const contactPerson = form.watch('contactPerson');
  const address = form.watch('address');
  const expectedCardVolume = form.watch('expectedCardVolume');

  // Update SEPA fields when contact person or address changes
  useEffect(() => {
    if (contactPerson && !form.getValues('accountHolder')) {
      form.setValue('accountHolder', contactPerson);
    }

    if (address && !form.getValues('accountAddress')) {
      form.setValue('accountAddress', address);
    }

    if (contactPerson && !form.getValues('signerName')) {
      form.setValue('signerName', contactPerson);
    }
  }, [contactPerson, address, form]);

  const [packages, setPackages] = useState<PackageOption[]>([
    {
      name: "S",
      originalPrice: "129€",
      discountedPrice: "99€",
      features: ["TSE Kasse", "unbegrenzte Lizenzen", "1 kostenloses Extras"]
    },
    {
      name: "M",
      originalPrice: "159€",
      discountedPrice: "129€",
      features: ["TSE Kasse", "unbegrenzte Lizenzen", "3 kostenlose Extras"],
      isTopSeller: true
    },
    {
      name: "L",
      originalPrice: "199€",
      discountedPrice: "159€",
      features: ["TSE Kasse", "unbegrenzte Lizenzen", "5 kostenlose Extras"]
    }
  ]);

  const editPackagePrice = (packageIndex: number, priceType: 'originalPrice' | 'discountedPrice', newPrice: string) => {
    const updatedPackages = [...packages];
    updatedPackages[packageIndex] = {
      ...updatedPackages[packageIndex],
      [priceType]: newPrice
    };
    setPackages(updatedPackages);
  };

  const extras: ExtraOption[] = [
    { id: "reservierung", name: "Reservierung" },
    { id: "webshop", name: "Webshop" },
    { id: "gutscheinkarten", name: "Online Gutscheinkarten" },
    { id: "rechnung", name: "Kauf auf Rechnung" },
    { id: "scan-to-order", name: "Scan-to-Order" },
    { id: "wolt", name: "Wolt Integration" },
    { id: "lieferando", name: "Lieferando Integration" },
    { id: "uber", name: "Uber Integration" }
  ];

  const [selfOrderOptions, setSelOrderOptions] = useState({
    tabletOrdering: false,
    tabletOrderingQuantity: 1,
    kiosk: false,
    kioskQuantity: 1,
    tablet: false,
    tabletQuantity: 1,
    bierhahnkamera: false
  });

  const [hardwareOptions, setHardwareOptions] = useState({
    bonDrucker: false,
    bonDruckerQuantity: 2,
    alloGo: false,
    alloGoQuantity: 1,
    iPad: false,
    iPadQuantity: 1
  });

  const additionalHardwareOptions = [
    "allO Go Hülle",
    "Metal QR Code",
    "Drucker mit Kassenladenabschluss",
    "WisePOS E Terminal"
  ];

  const [servicesOptions, setServicesOptions] = useState({
    support: true,
    steuerberater: true,
    website: false,
    fotoshooting: false,
    tse: true
  });

  const [amexCheckbox, setAmexCheckbox] = useState(false);

  // Make support options not adjustable
  useEffect(() => {
    setServicesOptions(prev => ({
      ...prev,
      support: true,
      steuerberater: true
    }));
  }, []);

  const handleExtraToggle = (extraId: string) => {
    setSelectedExtras(prev =>
      prev.includes(extraId)
        ? prev.filter(id => id !== extraId)
        : [...prev, extraId]
    );
  };

  const handleHardwareToggle = (option: keyof typeof hardwareOptions) => {
    if (option.endsWith('Quantity')) return;

    setHardwareOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const handleHardwareQuantityChange = (option: 'bonDruckerQuantity' | 'alloGoQuantity' | 'iPadQuantity', value: number) => {
    if (value >= 1 && value <= 99) {
      setHardwareOptions(prev => ({
        ...prev,
        [option]: value
      }));
    }
  };

  const handleServicesToggle = (option: keyof typeof servicesOptions) => {
    // Only allow toggling website, fotoshooting, and tse
    if (option === 'website' || option === 'fotoshooting' || option === 'tse') {
      setServicesOptions(prev => ({
        ...prev,
        [option]: !prev[option]
      }));
    }
  };

  const handleSelfOrderToggle = (option: keyof typeof selfOrderOptions) => {
    if (option.endsWith('Quantity')) return;

    setSelOrderOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const handleQuantityChange = (option: 'kioskQuantity' | 'tabletQuantity' | 'tabletOrderingQuantity', value: number) => {
    if (value >= 1 && value <= 99) {
      setSelOrderOptions(prev => ({
        ...prev,
        [option]: value
      }));
    }
  };

  const generatePDF = () => {
    if (!contractRef.current) return;

    const element = contractRef.current;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: 'allo-contract.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Instead of saving directly, get the output as blob
    html2pdf().set(opt).from(element).toPdf().output('datauristring').then((dataUrl: string) => {
      setPdfDataUrl(dataUrl);
      setShowPreviewDialog(true);
    });
  };

  const printPDF = () => {
    if (pdfDataUrl) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = pdfDataUrl;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      };
    }
  };

  const sendPdfViaEmail = () => {
    // In a real app, this would send the PDF via email
    toast.success("Contract PDF sent via email");
    setShowPreviewDialog(false);
    setShowSuccessDialog(true);
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!selectedPackage) {
      toast.error("Bitte wählen Sie ein Paket");
      return;
    }

    if (!selectedPayment) {
      toast.error("Bitte wählen Sie einen Zahlungstarif");
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast.error("Bitte unterschreiben Sie das Formular");
      return;
    }

    // In a real app, we would save the signature as an image
    const signatureDataUrl = signatureRef.current.toDataURL();
    console.log('Signature data URL:', signatureDataUrl);

    console.log("Form data:", data);
    console.log("Selected package:", selectedPackage);
    console.log("Selected extras:", selectedExtras);
    console.log("Selected payment:", selectedPayment);
    console.log("Self-order options:", selfOrderOptions);
    console.log("Hardware options:", hardwareOptions);
    console.log("Services options:", servicesOptions);
    console.log("Onboarding type:", onboardingType);

    generatePDF();
  };

  const currentPackage = packages.find(p => p.name === selectedPackage);

  // Format expected card volume with Euro sign
  const formatCardVolume = (value: string) => {
    if (!value) return '';
    // Remove non-numeric characters
    const numericValue = value.replace(/[^\d]/g, '');
    return `${numericValue}€`;
  };

  return (
    <div className="allo-page pb-12">
      <div className="w-full max-w-4xl mx-auto py-4">
        <Button
          variant="outline"
          className="mb-6"
          onClick={() => navigate('/')}
        >
          <ChevronLeft size={16} className="mr-1" />
          Back to Home
        </Button>

        <div className="allo-card w-full mb-8">
          <h2 className="text-xl font-semibold mb-6">Create New Contract</h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Restaurant Information</h3>

                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Firmenname</FormLabel>
                        <FormControl>
                          <Input placeholder="Firmenname eingeben" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse</FormLabel>
                        <FormControl>
                          <Input placeholder="Restaurant Adresse" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ansprechpartner</FormLabel>
                          <FormControl>
                            <Input placeholder="Name des Ansprechpartners" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Email Adresse"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="mobile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mobile</FormLabel>
                            <FormControl>
                              <div className="flex">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-input rounded-l-md cursor-pointer hover:bg-gray-200">
                                      {countryCode}
                                    </span>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-48 p-0">
                                    <div className="grid grid-cols-1 gap-1 p-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCountryCode("+49")}
                                        className="justify-start"
                                      >
                                        +49 (Germany)
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCountryCode("+43")}
                                        className="justify-start"
                                      >
                                        +43 (Austria)
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCountryCode("+41")}
                                        className="justify-start"
                                      >
                                        +41 (Switzerland)
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCountryCode("+33")}
                                        className="justify-start"
                                      >
                                        +33 (France)
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCountryCode("+31")}
                                        className="justify-start"
                                      >
                                        +31 (Netherlands)
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <Input
                                  className="rounded-l-none"
                                  placeholder="+49xxxxxxxxxx"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="alloBeratername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dein gjbkrghiefijnwgijo Berater</FormLabel>
                        <FormControl>
                          <Input placeholder="Dein Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-200 py-2 px-4 rounded-md">
                  <h3 className="text-center font-medium">Wähle Dein Paket</h3>
                </div>

                <div className="bg-black text-amber-400 py-3 px-4 rounded-md text-center font-medium mb-4">
                  Wichtig: nur 9,9€/Monat in den ersten{" "}
                  <Popover>
                    <PopoverTrigger asChild>
                      <span className="underline cursor-pointer">{promotionMonths}</span>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-2">
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-medium mb-1">Anzahl der Monate:</span>
                        <div className="flex justify-around">
                          {[3, 6, 9, 12].map(month => (
                            <Button
                              key={month}
                              variant={promotionMonths === month ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPromotionMonths(month)}
                            >
                              {month}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {" "}Monaten!
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {packages.map((pkg, idx) => (
                    <div
                      key={pkg.name}
                      className={`relative border rounded-md p-4 text-center ${selectedPackage === pkg.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      {pkg.isTopSeller && (
                        <div className="absolute -top-3 -right-3 bg-gray-800 text-white rounded-full w-16 h-16 flex flex-col items-center justify-center text-xs transform rotate-12">
                          <span>Top</span>
                          <span>Seller</span>
                        </div>
                      )}

                      <div className="flex items-center justify-center space-x-3 mb-3">
                        <Checkbox
                          id={`package-${pkg.name}`}
                          checked={selectedPackage === pkg.name}
                          onCheckedChange={() => setSelectedPackage(selectedPackage === pkg.name ? "" : pkg.name)}
                        />
                        <Label htmlFor={`package-${pkg.name}`} className="text-lg font-medium">{pkg.name}</Label>
                      </div>

                      <div className="mb-3 flex flex-col items-center">
                        <div className="text-sm">TSE Kasse</div>
                        <div className="text-sm">unbegrenzte Lizenzen</div>
                        <div className="text-sm">{pkg.features[2]}</div>
                      </div>

                      <div className="flex items-baseline justify-center space-x-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <span className="line-through text-gray-500 cursor-pointer">{pkg.originalPrice}</span>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2">
                            <div className="space-y-2">
                              <Label htmlFor={`original-price-${idx}`}>Original Preis</Label>
                              <Input
                                id={`original-price-${idx}`}
                                value={pkg.originalPrice.replace('€', '')}
                                onChange={(e) => editPackagePrice(idx, 'originalPrice', `${e.target.value}€`)}
                                className="mb-2"
                              />
                              <Button
                                size="sm"
                                onClick={() => setEditingPrices(false)}
                                className="w-full"
                              >
                                Speichern
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger asChild>
                            <span className="font-bold cursor-pointer">{pkg.discountedPrice}</span>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2">
                            <div className="space-y-2">
                              <Label htmlFor={`discounted-price-${idx}`}>Rabattierter Preis</Label>
                              <Input
                                id={`discounted-price-${idx}`}
                                value={pkg.discountedPrice.replace('€', '')}
                                onChange={(e) => editPackagePrice(idx, 'discountedPrice', `${e.target.value}€`)}
                                className="mb-2"
                              />
                              <Button
                                size="sm"
                                onClick={() => setEditingPrices(false)}
                                className="w-full"
                              >
                                Speichern
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <span className="text-sm text-gray-600">/Monat</span>
                      </div>

                      <div className="text-xs text-gray-500 mt-1">*Monatlich kündbar</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-200 py-2 px-4 rounded-md">
                  <h3 className="text-center font-medium">Wähle Deine kostenlosen Extras</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {extras.map((extra) => (
                    <div key={extra.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`extra-${extra.id}`}
                        checked={selectedExtras.includes(extra.id)}
                        onCheckedChange={() => handleExtraToggle(extra.id)}
                      />
                      <Label htmlFor={`extra-${extra.id}`}>{extra.name}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-200 py-2 px-4 rounded-md">
                  <h3 className="text-center font-medium">Wähle Deinen unglaublich günstigen Zahlungstarif</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-100 p-4 rounded-md">
                  <div className="border rounded-md p-3 flex flex-col bg-white">
                    <div className="font-medium text-sm text-gray-600 mb-2 text-center">Einheitstarif</div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="payment-option1"
                        checked={selectedPayment === "option1"}
                        onCheckedChange={() => setSelectedPayment(selectedPayment === "option1" ? "" : "option1")}
                      />
                      <Label htmlFor="payment-option1">0.79% + 0.08€</Label>
                    </div>
                  </div>

                  <div className="border rounded-md p-3 bg-white">
                    <div className="font-medium text-sm text-gray-600 mb-2 text-center">Differenzierter Tarif</div>
                    <div className="flex items-center space-x-0 flex-col items-start">
                      <div className="pl-6 text-sm">Debit: 0.49% + 0.08€</div>
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="payment-option2"
                          checked={selectedPayment === "option2"}
                          onCheckedChange={() => setSelectedPayment(selectedPayment === "option2" ? "" : "option2")}
                        />
                        <Label htmlFor="payment-option2"></Label>
                      </div>
                      <div className="pl-6 text-sm">Kredit: 0.99% + 0.08€</div>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-center items-center space-x-2 mt-1">
                    <Checkbox
                      id="cardTypes"
                      checked={amexCheckbox}
                      onCheckedChange={() => setAmexCheckbox(!amexCheckbox)}
                    />
                    <Label htmlFor="cardTypes" className="text-sm">Gültig auch für Amex, Firmenkarten & internationale Karten</Label>
                  </div>
                  <div className="md:col-span-2 text-xs text-gray-500 text-center -mt-1">
                    *die Gebühren werden auf den Endkunden umgelegt*
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-200 py-2 px-4 rounded-md">
                  <h3 className="text-center font-medium">Mache Umsatz wie McDonald's</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tablet-ordering"
                        checked={selfOrderOptions.tabletOrdering}
                        onCheckedChange={() => handleSelfOrderToggle("tabletOrdering")}
                      />
                      <Label htmlFor="tablet-ordering">Tablet Ordering: 19€ /Tablet/Monat</Label>
                    </div>
                    {selfOrderOptions.tabletOrdering && (
                      <div className="flex items-center">
                        <Label htmlFor="ordering-quantity" className="mr-2 text-sm">Anzahl:</Label>
                        <Input
                          id="ordering-quantity"
                          type="number"
                          min="1"
                          max="99"
                          className="w-16 h-8 text-center"
                          value={selfOrderOptions.tabletOrderingQuantity}
                          onChange={(e) => handleQuantityChange('tabletOrderingQuantity', parseInt(e.target.value))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="self-order-kiosk"
                        checked={selfOrderOptions.kiosk}
                        onCheckedChange={() => handleSelfOrderToggle("kiosk")}
                      />
                      <Label htmlFor="self-order-kiosk">Self-order Kiosk: 59€ /Kiosk/Monat</Label>
                    </div>
                    {selfOrderOptions.kiosk && (
                      <div className="flex items-center">
                        <Label htmlFor="kiosk-quantity" className="mr-2 text-sm">Anzahl:</Label>
                        <Input
                          id="kiosk-quantity"
                          type="number"
                          min="1"
                          max="99"
                          className="w-16 h-8 text-center"
                          value={selfOrderOptions.kioskQuantity}
                          onChange={(e) => handleQuantityChange('kioskQuantity', parseInt(e.target.value))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="kitchen-monitor"
                      checked={selfOrderOptions.tablet}
                      onCheckedChange={() => handleSelfOrderToggle("tablet")}
                    />
                    <Label htmlFor="kitchen-monitor">Kitchen Monitor: 59€ /Monat</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bierhahnkamera"
                      checked={selfOrderOptions.bierhahnkamera}
                      onCheckedChange={() => handleSelfOrderToggle("bierhahnkamera")}
                    />
                    <Label htmlFor="bierhahnkamera">Dirmeier Bierschranksystem: 59€ /Monat</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-200 py-2 px-4 rounded-md">
                  <h3 className="text-center font-medium">Kostenloses Hardware Paket</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bon-drucker"
                      checked={hardwareOptions.bonDrucker}
                      onCheckedChange={() => handleHardwareToggle("bonDrucker")}
                    />
                    <Label htmlFor="bon-drucker">
                      <Popover>
                        <PopoverTrigger asChild>
                          <span className="cursor-pointer">{hardwareOptions.bonDruckerQuantity}x Bon Drucker</span>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2">
                          <div className="space-y-2">
                            <Label htmlFor="bon-drucker-quantity">Anzahl</Label>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleHardwareQuantityChange('bonDruckerQuantity', Math.max(1, hardwareOptions.bonDruckerQuantity - 1))}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                id="bon-drucker-quantity"
                                type="number"
                                min="1"
                                max="99"
                                className="w-16 h-8 text-center"
                                value={hardwareOptions.bonDruckerQuantity}
                                onChange={(e) => handleHardwareQuantityChange('bonDruckerQuantity', parseInt(e.target.value))}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleHardwareQuantityChange('bonDruckerQuantity', Math.min(99, hardwareOptions.bonDruckerQuantity + 1))}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allo-go"
                      checked={hardwareOptions.alloGo}
                      onCheckedChange={() => handleHardwareToggle("alloGo")}
                    />
                    <Label htmlFor="allo-go">
                      <Popover>
                        <PopoverTrigger asChild>
                          <span className="cursor-pointer">{hardwareOptions.alloGoQuantity}x allO Go</span>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2">
                          <div className="space-y-2">
                            <Label htmlFor="allo-go-quantity">Anzahl</Label>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleHardwareQuantityChange('alloGoQuantity', Math.max(1, hardwareOptions.alloGoQuantity - 1))}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                id="allo-go-quantity"
                                type="number"
                                min="1"
                                max="99"
                                className="w-16 h-8 text-center"
                                value={hardwareOptions.alloGoQuantity}
                                onChange={(e) => handleHardwareQuantityChange('alloGoQuantity', parseInt(e.target.value))}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleHardwareQuantityChange('alloGoQuantity', Math.min(99, hardwareOptions.alloGoQuantity + 1))}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ipad"
                      checked={hardwareOptions.iPad}
                      onCheckedChange={() => handleHardwareToggle("iPad")}
                    />
                    <Label htmlFor="ipad">
                      <Popover>
                        <PopoverTrigger asChild>
                          <span className="cursor-pointer">{hardwareOptions.iPadQuantity}x iPad</span>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2">
                          <div className="space-y-2">
                            <Label htmlFor="ipad-quantity">Anzahl</Label>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleHardwareQuantityChange('iPadQuantity', Math.max(1, hardwareOptions.iPadQuantity - 1))}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                id="ipad-quantity"
                                type="number"
                                min="1"
                                max="99"
                                className="w-16 h-8 text-center"
                                value={hardwareOptions.iPadQuantity}
                                onChange={(e) => handleHardwareQuantityChange('iPadQuantity', parseInt(e.target.value))}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleHardwareQuantityChange('iPadQuantity', Math.min(99, hardwareOptions.iPadQuantity + 1))}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!showAdditionalHardware ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAdditionalHardware(true)}
                        className="text-blue-500"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Weiteres Hardwarestück hinzufügen
                      </Button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="additional-hardware"
                          checked={!!additionalHardwareItem}
                        />
                        <Select
                          value={additionalHardwareItem}
                          onValueChange={setAdditionalHardwareItem}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Hardwarestück wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {additionalHardwareOptions.map(option => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {additionalHardwareItem && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <span className="cursor-pointer ml-2">{additionalHardwareQuantity}x</span>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2">
                              <div className="space-y-2">
                                <Label htmlFor="additional-quantity">Anzahl</Label>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAdditionalHardwareQuantity(Math.max(1, additionalHardwareQuantity - 1))}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <Input
                                    id="additional-quantity"
                                    type="number"
                                    min="1"
                                    max="99"
                                    className="w-16 h-8 text-center"
                                    value={additionalHardwareQuantity}
                                    onChange={(e) => setAdditionalHardwareQuantity(parseInt(e.target.value) || 1)}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAdditionalHardwareQuantity(Math.min(99, additionalHardwareQuantity + 1))}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-200 py-2 px-4 rounded-md">
                  <h3 className="text-center font-medium">Leistungen</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="support"
                      checked={servicesOptions.support}
                      disabled={true}
                    />
                    <Label htmlFor="support">Kostenloser Support (11Uhr - min.23Uhr)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="steuerberater"
                      checked={servicesOptions.steuerberater}
                      disabled={true}
                    />
                    <Label htmlFor="steuerberater">Kostenlose Steuerberater-Support</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="website"
                      checked={servicesOptions.website}
                      onCheckedChange={() => handleServicesToggle("website")}
                    />
                    <Label htmlFor="website">Website: 99€ einmalige Zahlung</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fotoshooting"
                      checked={servicesOptions.fotoshooting}
                      onCheckedChange={() => handleServicesToggle("fotoshooting")}
                    />
                    <Label htmlFor="fotoshooting">Fotoshooting: Gratis* oder 499€ /Session</Label>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="tse"
                    checked={servicesOptions.tse}
                    onCheckedChange={() => handleServicesToggle("tse")}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="tse" className="font-medium">TSE</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Drei Monate nach Go-Live fällt eine einmalige Gebühr i.H.v. 300€ an.
                      Die TSE gilt für die gesamte Partnerschaft.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-200 py-2 px-4 rounded-md">
                  <h3 className="text-center font-medium">Onboarding Type</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="online-onboarding"
                      checked={onboardingType === "online"}
                      onCheckedChange={() => setOnboardingType(onboardingType === "online" ? "" : "online")}
                    />
                    <Label htmlFor="online-onboarding">Online Onboarding</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="onsite-onboarding"
                      checked={onboardingType === "onsite"}
                      onCheckedChange={() => setOnboardingType(onboardingType === "onsite" ? "" : "onsite")}
                    />
                    <Label htmlFor="onsite-onboarding">Onsite Onboarding</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-200 py-2 px-4 rounded-md">
                  <h3 className="text-center font-medium">Anmerkungen</h3>
                </div>

                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Weitere Informationen oder Anmerkungen"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expectedCardVolume"
                  render={({ field: { onChange, ...rest } }) => (
                    <FormItem>
                      <FormLabel>Expected Card Volume (EUR)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="z.B. 50000€"
                          onChange={(e) => {
                            // Remove non-numeric characters for storing
                            const rawValue = e.target.value.replace(/[^\d]/g, '');
                            onChange(rawValue);

                            // Format with € for display
                            if (e.target.value && !e.target.value.endsWith('€') && rawValue) {
                              e.target.value = `${rawValue}€`;
                            }
                          }}
                          value={expectedCardVolume ? `${expectedCardVolume}€` : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="bg-gray-200 py-2 px-4 rounded-md">
                  <h3 className="text-center font-medium">SEPA-Lastschrift</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="accountHolder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kontoinhaber/in</FormLabel>
                        <FormControl>
                          <Input placeholder="Name des Kontoinhabers" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse</FormLabel>
                        <FormControl>
                          <Input placeholder="Adresse des Kontoinhabers" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="iban"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IBAN</FormLabel>
                        <FormControl>
                          <Input placeholder="DE00 0000 0000 0000 0000 00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="goLiveDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voraussichtlicher Go-Live Datum</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-200 py-2 px-4 rounded-md">
                  <h3 className="text-center font-medium">Unterschrift</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="signerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Vollständiger Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="signatureDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Datum</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border border-gray-300 rounded-md p-2">
                  <div className="bg-gray-50 border-b border-gray-200 p-2 mb-2 flex justify-between items-center">
                    <span className="text-sm">Unterschrift</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearSignature}
                    >
                      Löschen
                    </Button>
                  </div>
                  <div className="h-[200px] bg-white border border-gray-100 rounded touch-none">
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{
                        className: 'w-full h-full'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <Button
                  type="submit"
                  className="allo-button"
                >
                  Complete Contract
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="hidden">
          <div ref={contractRef} className="bg-white p-8 max-w-[210mm]" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold" style={{ color: '#e19277' }}>allO</h1>
                <h2 className="text-xl font-bold">Angebot</h2>
              </div>
              <div className="bg-black text-amber-400 rounded-full p-3 text-center" style={{ width: '100px', height: '100px' }}>
                <div className="text-sm font-bold">Crazy Deal</div>
                <div className="text-xs">gültig bis</div>
                <div className="text-xs">31.03.2023</div>
              </div>
            </div>

            <div className="mb-6 space-y-1">
              <p><strong>Restaurant:</strong> {form.getValues().companyName}</p>
              <p><strong>Adresse:</strong> {form.getValues().address}</p>
              <p><strong>Ansprechpartner:</strong> {form.getValues().contactPerson}</p>
              <p><strong>Email:</strong> {form.getValues().email}</p>
              <p><strong>Mobile:</strong> {countryCode} {form.getValues().mobile}</p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Contract Preview</DialogTitle>
            <DialogDescription>
              Your contract has been successfully created. You can now print it or send it via email.
            </DialogDescription>
          </DialogHeader>

          {pdfDataUrl && (
            <div className="max-h-[60vh] overflow-auto my-4 border border-gray-200 rounded">
              <iframe src={pdfDataUrl} className="w-full h-[500px]" />
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={printPDF} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print PDF
            </Button>
            <Button onClick={sendPdfViaEmail} className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send PDF via Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contract Created</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="mb-4 bg-green-100 p-3 rounded-full">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-center mb-4">
              The contract has been successfully created and sent.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => navigate('/')}
            >
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateContract;
