import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useBranding } from "@/hooks/useBranding";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { getCompanyDisplayName, assets } = useBranding();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md fade-in-up">
        <CardContent className="text-center p-8">
          <img
            src={assets.logos.square}
            alt={getCompanyDisplayName()}
            className="w-16 h-16 mx-auto mb-6 opacity-50"
          />
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-xl font-semibold text-foreground mb-2">Page Not Found</h2>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
