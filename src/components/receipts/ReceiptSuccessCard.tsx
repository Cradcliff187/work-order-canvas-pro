import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface ReceiptSuccessCardProps {
  title?: string;
  message?: string;
  className?: string;
}

export const ReceiptSuccessCard: React.FC<ReceiptSuccessCardProps> = ({
  title = "Receipt Saved!",
  message = "Your receipt has been processed and saved successfully.",
  className
}) => {
  return (
    <Card className={`max-w-md mx-auto mt-8 ${className}`}>
      <CardContent className="pt-6 text-center">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
};