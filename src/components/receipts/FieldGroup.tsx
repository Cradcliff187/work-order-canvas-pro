import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FieldGroupProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const FieldGroup: React.FC<FieldGroupProps> = ({
  title,
  children,
  defaultOpen = false,
  badge,
  icon,
  isOpen,
  onOpenChange
}) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  return (
    <div className="w-full">
      <motion.button
        className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors"
        onClick={() => setOpen(!open)}
        whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
        whileTap={{ scale: 0.995 }}
        type="button"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <motion.div 
              className="text-muted-foreground"
              animate={open ? { scale: 1.1 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {icon}
            </motion.div>
          )}
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{title}</h3>
            {badge && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {badge}
              </motion.div>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </motion.button>
      
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: "auto", 
              opacity: 1,
              transition: {
                height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.2, delay: 0.1 }
              }
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              transition: {
                height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.1 }
              }
            }}
            style={{ overflow: 'hidden' }}
          >
            <motion.div 
              className="p-4 pt-2 space-y-4"
              initial={{ y: -10, opacity: 0 }}
              animate={{ 
                y: 0, 
                opacity: 1,
                transition: { delay: 0.15, duration: 0.2 }
              }}
              exit={{ y: -10, opacity: 0, transition: { duration: 0.1 } }}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};