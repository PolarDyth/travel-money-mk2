'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, AlertTriangle, Search, Check, Loader2 } from "lucide-react";
import { TransactionDraft, type CustomerSearchResult } from '@/app/(dashboard)/operator/transaction/schemas';
import { TransactionUpdateHandler } from '@/app/(dashboard)/operator/transaction/types';

interface StepCustomerProps {
  baseAmount: number;
  customer?: TransactionDraft['customer'];
  onUpdate: TransactionUpdateHandler;
  onNext: () => void;
  onBack: () => void;
  showDenominationsStep?: boolean;
}

export function StepCustomer({
  baseAmount,
  customer,
  onUpdate,
  onNext,
  onBack,
  showDenominationsStep = true,
}: StepCustomerProps) {

  const requiresID = baseAmount > 1500;

  // Search state
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<CustomerSearchResult[]>([]);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
  const [searchDebug, setSearchDebug] = React.useState<any>(null);
  const [showDebug, setShowDebug] = React.useState(false);

  const handleChange = (field: string, value: string) => {
    onUpdate({
      customer: {
        ...customer,
        [field]: value
      }
    });
    // Clear search state when form is manually edited (but not during initial search)
    // Only clear if we're not currently searching
    if (searchResults.length > 0 && !isSearching) {
      setSearchResults([]);
      setSelectedCustomerId(null);
    }
  };

  const handleSearch = async () => {
    // Reset search state
    setSearchError(null);
    setSearchResults([]);
    setSelectedCustomerId(isSearching ? null : selectedCustomerId);

    // Validate required fields for search
    if (!customer?.first_name?.trim() || !customer?.last_name?.trim()) {
      setSearchError("Please enter both first and last name to search");
      return;
    }
    if (!customer?.postcode?.trim()) {
      setSearchError("Please enter a postcode to search");
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch('/api/customers/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: customer.first_name,
          last_name: customer.last_name,
          postcode: customer.postcode,
        }),
      });

      const result = await response.json();

      // Store debug info
      if (result.debug) {
        setSearchDebug(result.debug);
      }

      if (!result.success) {
        setSearchError(result.error?.message || "Search failed");
        return;
      }

      if (!result.data || result.data.length === 0) {
        setSearchResults([]);
        // Show debug when no results
        if (result.debug) {
          setShowDebug(true);
        }
      } else {
        setSearchResults(result.data);
        // Auto-show debug when results are found
        setShowDebug(true);
      }
    } catch {
      setSearchError("Failed to connect to search service");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCustomer = (foundCustomer: CustomerSearchResult) => {
    // Fill in the form data, but NOT the ID (must be re-entered)
    onUpdate({
      customer: {
        first_name: foundCustomer.first_name,
        last_name: foundCustomer.last_name,
        address_line_1: foundCustomer.address_line_1,
        city: foundCustomer.city,
        postcode: foundCustomer.postcode,
        id_type: foundCustomer.id_type,
        id_reference: '', // Always empty - must be re-entered
      }
    });
    setSelectedCustomerId(foundCustomer.id);
    setSearchResults([]);
  };

  const canSearch = () => {
    return customer?.first_name?.trim() &&
           customer?.last_name?.trim() &&
           customer?.postcode?.trim();
  };

  const isValid = () => {
    if (!customer?.first_name || !customer?.last_name) return false;
    if (requiresID && (!customer?.id_type || !customer?.id_reference)) return false;
    return true;
  };

  const showSearchPrompt = () => {
    return canSearch() && !searchResults.length && !selectedCustomerId && !isSearching;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
          <CardDescription>
            {requiresID
              ? <span className="text-destructive font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> AMOUNT EXCEEDS £1500 - ID REQUIRED</span>
              : "Enter basic customer information."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCustomerId && (
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Existing customer found. Details have been filled in. Please verify and enter ID number.
              </AlertDescription>
            </Alert>
          )}

          {searchError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{searchError}</AlertDescription>
            </Alert>
          )}

          {searchResults.length > 0 && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Found {searchResults.length} matching customer{searchResults.length > 1 ? 's' : ''}</Label>
                  <span className="text-xs text-muted-foreground">- Click to select</span>
                </div>
                <div className="space-y-2">
                  {searchResults.map((foundCustomer) => (
                    <button
                      key={foundCustomer.id}
                      type="button"
                      onClick={() => handleSelectCustomer(foundCustomer)}
                      className="w-full text-left p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent/5 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">
                              {foundCustomer.first_name} {foundCustomer.last_name}
                            </span>
                            {foundCustomer.id_type && (
                              <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                                {foundCustomer.id_type.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {foundCustomer.address_line_1 && (
                              <>{foundCustomer.address_line_1}</>
                            )}
                            {foundCustomer.city && foundCustomer.address_line_1 && <>, </>}
                            {foundCustomer.city && <>{foundCustomer.city}</>}
                            {foundCustomer.postcode && (
                              <span className="font-medium text-foreground ml-1">
                                {foundCustomer.postcode}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs font-medium">Select</span>
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Debug section */}
          {searchDebug && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setShowDebug(!showDebug)}
              >
                {showDebug ? 'Hide' : 'Show'} Search Debug Info
              </Button>
              {showDebug && (
                <div className="p-4 bg-muted rounded-md text-xs font-mono overflow-auto max-h-96">
                  <div className="space-y-2">
                    <div><strong>Search Input:</strong> {JSON.stringify(searchDebug.searchInput)}</div>
                    <div><strong>Search Postcode (normalized):</strong> {searchDebug.searchPostcodeNormalized}</div>
                    <div><strong>Name Results Count:</strong> {searchDebug.nameResultsCount}</div>
                    <div><strong>Processed Count:</strong> {searchDebug.processedCount}</div>
                    <div><strong>Matches Count:</strong> {searchDebug.matchesCount}</div>
                    {searchDebug.details && searchDebug.details.length > 0 && (
                      <div className="mt-4">
                        <div className="font-bold mb-2">Customer Details:</div>
                        {searchDebug.details.map((detail: any, idx: number) => (
                          <div key={idx} className="mb-3 p-2 bg-background rounded border">
                            <div className="font-semibold text-foreground">Customer {detail.customerId?.slice(0, 8)}...</div>
                            <div className="text-muted-foreground mt-1">Address: "{detail.address}"</div>
                            <div className="text-muted-foreground">Address parts: {JSON.stringify(detail.addressParts)}</div>
                            <div className="text-muted-foreground">Extracted postcode: "{detail.extractedPostcode}"</div>
                            <div className="text-muted-foreground">Normalized: "{detail.customerPostcode}"</div>
                            <div className={detail.match ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                              {detail.match ? "✓ MATCH" : "✗ NO MATCH"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input
                autoFocus
                value={customer?.first_name || ''}
                onChange={(e) => handleChange('first_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                 value={customer?.last_name || ''}
                 onChange={(e) => handleChange('last_name', e.target.value)}
              />
            </div>
          </div>

           <div className="space-y-2">
              <Label>Address Line 1</Label>
              <Input
                 value={customer?.address_line_1 || ''}
                 onChange={(e) => handleChange('address_line_1', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label>City</Label>
                <Input
                   value={customer?.city || ''}
                   onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
               <div className="space-y-2">
                <Label>Postcode</Label>
                <Input
                   value={customer?.postcode || ''}
                   onChange={(e) => handleChange('postcode', e.target.value)}
                />
              </div>
            </div>

            {showSearchPrompt() && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleSearch}
              >
                <Search className="h-4 w-4 mr-2" />
                Search Existing Customer
              </Button>
            )}

            {isSearching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Searching...
              </div>
            )}

          {requiresID && (
             <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-md space-y-4 mt-6">
                <h4 className="font-semibold text-destructive flex items-center gap-2">
                   <InfoIcon className="h-4 w-4"/> Identity Verification
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-foreground">ID Type</Label>
                        <Select
                            value={customer?.id_type || ''}
                            onValueChange={(val) => handleChange('id_type', val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select ID Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="passport">Passport</SelectItem>
                                <SelectItem value="driving_license">Driving License</SelectItem>
                                <SelectItem value="national_id">National ID Card</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-foreground">ID Reference No</Label>
                        <Input
                           value={customer?.id_reference || ''}
                           onChange={(e) => handleChange('id_reference', e.target.value)}
                           placeholder="e.g. 123456789"
                        />
                    </div>
                </div>
                {selectedCustomerId && (
                  <p className="text-sm text-muted-foreground">
                    ID number must be re-entered for security verification
                  </p>
                )}
             </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
         <Button variant="outline" onClick={onBack}>Back</Button>
         <Button onClick={onNext} disabled={!isValid()}>
           Next ({showDenominationsStep ? 'Denominations' : 'Review'})
         </Button>
      </div>
    </div>
  );
}
