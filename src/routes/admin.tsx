import { createFileRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Package, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { LOGO_HORIZONTAL } from "@/lib/assets";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Quản trị — Nhà In Thiên Thiên" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Khu vực quản trị đơn hàng Nhà In Thiên Thiên." },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { to: "/admin/don-hang", label: "Đơn hàng", icon: ShoppingBag, exact: false },
  { to: "/admin/san-pham", label: "Sản phẩm & giá", icon: Package, exact: false },
] as const;

function AdminLayout() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
      setChecked(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!checked) {
    return <div className="p-10 text-center text-muted-foreground">Đang tải…</div>;
  }

  if (!signedIn) return <AdminLogin />;

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-panel sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:px-6">
          <Link to="/">
            <img src={LOGO_HORIZONTAL} alt="Nhà In Thiên Thiên" className="h-9 w-auto" />
          </Link>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            Quản trị
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success("Đã đăng xuất");
              router.navigate({ to: "/admin" });
            }}
          >
            <LogOut className="size-4" /> Đăng xuất
          </Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 md:px-6">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold text-foreground/80"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <Outlet />
      </main>
    </div>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        className="glass-card w-full max-w-md rounded-3xl p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          setLoading(false);
          if (error) toast.error("Không đăng nhập được: " + error.message);
          else toast.success("Chào mừng trở lại!");
        }}
      >
        <img src={LOGO_HORIZONTAL} alt="Nhà In Thiên Thiên" className="mx-auto h-12 w-auto" />
        <h1 className="mt-4 text-center text-2xl font-extrabold text-primary">Đăng nhập quản trị</h1>
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </Button>
        </div>
      </form>
    </div>
  );
}
