'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { TransactionDraft } from '@/app/operator/transaction/actions';
import { TransactionUpdateHandler } from '@/app/operator/transaction/types';

interface StepReviewProps {
  data: TransactionDraft;
  isSubmitting: boolean;
  onUpdate: TransactionUpdateHandler;
  onSubmit: () => void;
  onBack: () => void;
}

export function StepReview({
  data,
  isSubmitting,
  onUpdate,
  onSubmit,
  onBack
}: StepReviewProps) {

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review & Payment</CardTitle>
          <CardDescription>Confirm transaction details and select payment method.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            
            <div className="rounded-md border">
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">Transaction</TableCell>
                            <TableCell className="text-right uppercase font-bold">{data.type} {data.currency_code}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">Amount {data.currency_code}</TableCell>
                            <TableCell className="text-right font-mono">{data.foreign_amount.toFixed(2)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">Rate</TableCell>
                            <TableCell className="text-right font-mono">{data.exchange_rate.toFixed(4)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/50">
                            <TableCell className="font-medium">Total GBP</TableCell>
                            <TableCell className="text-right font-mono font-bold text-lg">£ {data.base_amount.toFixed(2)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <Tabs value={data.payment_method} onValueChange={(val) => onUpdate({ payment_method: val as 'cash' | 'card' })}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="card">Card Payment</TabsTrigger>
                    <TabsTrigger value="cash">Cash Payment</TabsTrigger>
                </TabsList>
                <TabsContent value="card" className="p-4 bg-muted/20 rounded-md">
                    <p className="text-sm text-center text-muted-foreground">Ensure card terminal is ready.</p>
                </TabsContent>
                <TabsContent value="cash" className="p-4 bg-muted/20 rounded-md">
                     <p className="text-sm text-center text-muted-foreground">
                        {data.type === 'buy' ? 'Dispense' : 'Collect'} 
                        <span className="font-bold ml-1">£{data.base_amount.toFixed(2)}</span>
                     </p>
                </TabsContent>
            </Tabs>

        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
             <Button variant="outline" onClick={onBack} disabled={isSubmitting}>Back</Button>
             <Button size="lg" onClick={onSubmit} disabled={isSubmitting}>
               {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Complete Transaction
             </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
