'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { InfoIcon, AlertTriangle } from "lucide-react";
import { TransactionDraft } from '@/app/(dashboard)/operator/transaction/schemas';
import { TransactionUpdateHandler } from '@/app/(dashboard)/operator/transaction/types';

interface StepCustomerProps {
  baseAmount: number;
  customer?: TransactionDraft['customer'];
  onUpdate: TransactionUpdateHandler;
  onNext: () => void;
  onBack: () => void;
}

export function StepCustomer({
  baseAmount,
  customer,
  onUpdate,
  onNext,
  onBack
}: StepCustomerProps) {
  
  const requiresID = baseAmount > 1500;

  const handleChange = (field: string, value: string) => {
    onUpdate({
      customer: {
        ...customer,
        [field]: value
      }
    });
  };

  const isValid = () => {
    if (!customer?.first_name || !customer?.last_name) return false;
    if (requiresID && (!customer?.id_type || !customer?.id_reference)) return false;
    return true;
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
             </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
         <Button variant="outline" onClick={onBack}>Back</Button>
         <Button onClick={onNext} disabled={!isValid()}>
           Next (Denominations)
         </Button>
      </div>
    </div>
  );
}
