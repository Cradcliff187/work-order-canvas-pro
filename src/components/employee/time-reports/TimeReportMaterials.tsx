import { useFormContext } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface TimeReportMaterialsProps {
  disabled?: boolean;
  className?: string;
}

export function TimeReportMaterials({
  disabled = false,
  className,
}: TimeReportMaterialsProps) {
  const form = useFormContext();

  return (
    <div className={cn("", className)}>
      <FormField
        control={form.control}
        name="materialsUsed"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Materials Used</FormLabel>
            <FormControl>
              <Textarea
                placeholder="List any materials or parts used..."
                className="min-h-[80px] resize-none"
                disabled={disabled}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}