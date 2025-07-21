import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  formatPhoneNumber,
  formatEmail,
  formatZipCode,
  formatStreetAddress,
  formatCity,
} from "@/utils/formatting"

export interface FormattedInputProps
  extends React.ComponentProps<"input"> {
  formatter?: 'phone' | 'email' | 'zip' | 'streetAddress' | 'city';
}

const FormattedInput = React.forwardRef<HTMLInputElement, FormattedInputProps>(
  ({ className, formatter, onBlur, ...props }, ref) => {
    const formatters = {
      phone: formatPhoneNumber,
      email: formatEmail,
      zip: formatZipCode,
      streetAddress: formatStreetAddress,
      city: formatCity,
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      if (formatter && formatters[formatter]) {
        const currentValue = event.target.value;
        const formattedValue = formatters[formatter](currentValue);
        
        // Update the input value
        if (formattedValue !== currentValue) {
          event.target.value = formattedValue;
          
          // Trigger onChange if it exists to keep form libraries in sync
          if (props.onChange) {
            const syntheticEvent = {
              ...event,
              target: {
                ...event.target,
                value: formattedValue,
              },
            } as React.ChangeEvent<HTMLInputElement>;
            props.onChange(syntheticEvent);
          }
        }
      }
      
      // Call the original onBlur if provided
      if (onBlur) {
        onBlur(event);
      }
    };

    return (
      <Input
        className={cn(className)}
        onBlur={handleBlur}
        ref={ref}
        {...props}
      />
    )
  }
)
FormattedInput.displayName = "FormattedInput"

export { FormattedInput }
