import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Dashboard } from "@/components/Dashboard";
import { Products } from "@/components/Products";
import { Orders } from "@/components/Orders";
import { Customers } from "@/components/Customers";
import { Stock } from "@/components/Stock";
import { Deliveries } from "@/components/Deliveries";
import Reports from "@/components/Reports";
import { Users } from "@/components/Users";

export type ActivePage = 'dashboard' | 'products' | 'orders' | 'customers' | 'stock' | 'deliveries' | 'reports' | 'users';

const Index = () => {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <Products />;
      case 'orders':
        return <Orders />;
      case 'customers':
        return <Customers />;
      case 'stock':
        return <Stock />;
      case 'deliveries':
        return <Deliveries />;
      case 'reports':
        return <Reports />;
      case 'users':
        return <Users />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-blue-50">
        <AppSidebar activePage={activePage} setActivePage={setActivePage} />
        <main className="flex-1 flex flex-col">
          <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Sistema de Gestão da Loja</h1>
                <p className="text-sm text-gray-600">Gerencie sua loja de forma eficiente</p>
              </div>
            </div>
          </header>
          <div className="flex-1 p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
