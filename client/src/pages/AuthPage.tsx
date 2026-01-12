import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [prefillEmail, setPrefillEmail] = useState<string>("");
  const [prefillPassword, setPrefillPassword] = useState<string>("");

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // After successful registration, automatically switch to login tab
  useEffect(() => {
    if (registerMutation.isSuccess) {
      setActiveTab("login");
      // Reset mutation state so this effect doesn't keep firing
      registerMutation.reset();
    }
  }, [registerMutation]);

  if (user) return null;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-white/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-white mb-2 tracking-wider">C10 NOIR</h1>
          <p className="text-neutral-400 text-sm uppercase tracking-widest">Members Access</p>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "login" | "register")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-neutral-900 mb-6">
            <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:text-black">LOGIN</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-white data-[state=active]:text-black">REGISTER</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <LoginForm 
              onSubmit={(data) => loginMutation.mutate(data)} 
              isLoading={loginMutation.isPending}
              initialEmail={prefillEmail}
              initialPassword={prefillPassword}
            />
          </TabsContent>
          
          <TabsContent value="register">
            <RegisterForm 
              onSubmit={(data) => {
                // Remember credentials so we can prefill login after successful registration
                if (data?.email) setPrefillEmail(data.email);
                if (data?.password) setPrefillPassword(data.password);
                registerMutation.mutate(data);
              }} 
              isLoading={registerMutation.isPending} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LoginForm({ 
  onSubmit, 
  isLoading,
  initialEmail = "",
  initialPassword = "",
}: { 
  onSubmit: (data: any) => void; 
  isLoading: boolean;
  initialEmail?: string;
  initialPassword?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    setPassword(initialPassword);
  }, [initialPassword]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <Card className="bg-neutral-900/50 border-white/10 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-white">Welcome Back</CardTitle>
        <CardDescription>Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              required 
              className="bg-black/50 border-white/10 text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              required 
              className="bg-black/50 border-white/10 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full bg-white text-black hover:bg-neutral-200" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
          </Button>
          
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-neutral-900 px-2 text-neutral-500">Or continue with</span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full border-white/10 text-white hover:bg-white/5 hover:text-white"
            onClick={() => console.log("Mock Google Login")}
          >
            Google (Mock)
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function RegisterForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void, isLoading: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [cooldownTotal, setCooldownTotal] = useState(0);
  const { data: settings } = useQuery<any>({ queryKey: ["/api/settings"] });
  const { toast } = useToast();

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (!cooldownSeconds) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSendOtp = async () => {
    if (!email) return toast({ title: "Email required", variant: "destructive" });
    if (isSendingOtp || cooldownSeconds > 0) return;
    try {
      setIsSendingOtp(true);
      await apiRequest("POST", "/api/auth/send-otp", { email });
      setOtpSent(true);
      const interval = settings?.otpResendIntervalSeconds ?? 60;
      setCooldownSeconds(interval);
      setCooldownTotal(interval);
      toast({ title: "OTP sent to your email" });
    } catch (err) {
      toast({ title: "Failed to send OTP", variant: "destructive" });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings?.emailVerificationEnabled && !otpSent) {
      return handleSendOtp();
    }
    onSubmit({ name, email, password, otp });
  };

  const isVerificationRequired = settings?.emailVerificationEnabled;

  return (
    <Card className="bg-neutral-900/50 border-white/10 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-white">Create Account</CardTitle>
        <CardDescription>Join the C10 exclusive members club</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reg-name">Full Name</Label>
            <Input 
              id="reg-name" 
              required 
              className="bg-black/50 border-white/10 text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email">Email</Label>
            <div className="flex gap-2">
              <Input 
                id="reg-email" 
                type="email" 
                required 
                className="bg-black/50 border-white/10 text-white"
                value={email}
                disabled={otpSent}
                onChange={(e) => setEmail(e.target.value)}
              />
              {isVerificationRequired && !otpSent && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleSendOtp} 
                  className="shrink-0 border-white/10 text-white hover:bg-white/5"
                  disabled={isSendingOtp || cooldownSeconds > 0}
                >
                  {isSendingOtp ? "Sending..." : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Send OTP"}
                </Button>
              )}
            </div>
            {isVerificationRequired && cooldownTotal > 0 && (
              <div className="mt-2 space-y-1">
                <Progress 
                  value={
                    cooldownSeconds > 0 && cooldownTotal > 0
                      ? ((cooldownTotal - cooldownSeconds) / cooldownTotal) * 100
                      : 100
                  } 
                  className="h-2 bg-white/10"
                />
                {cooldownSeconds > 0 && (
                  <p className="text-xs text-neutral-400">
                    You can request a new OTP in {cooldownSeconds}s
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password">Password</Label>
            <Input 
              id="reg-password" 
              type="password" 
              required 
              className="bg-black/50 border-white/10 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {isVerificationRequired && otpSent && (
            <div className="space-y-2">
              <Label htmlFor="reg-otp">Enter OTP</Label>
              <Input 
                id="reg-otp" 
                required 
                placeholder="6-digit code"
                className="bg-black/50 border-white/10 text-white"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button type="button" onClick={() => setOtpSent(false)} className="text-xs text-neutral-400 hover:text-white underline">Change Email</button>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full bg-white text-black hover:bg-neutral-200" disabled={isLoading || (isVerificationRequired && !otpSent)}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isVerificationRequired && !otpSent ? "Send OTP First" : "Register")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
