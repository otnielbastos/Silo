import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";
import { useCustomers, Customer } from "@/hooks/useCustomers";
import { CustomerFormModal } from "@/components/CustomerFormModal";
import { useToast } from "@/hooks/use-toast";

interface CustomerSelectProps {
  value?: number;
  onValueChange: (customerId: number, customer: Customer) => void;
}

export function CustomerSelect({ value, onValueChange }: CustomerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { customers, loading, addCustomer, refreshCustomers } = useCustomers();
  const { toast } = useToast();

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const selectedCustomer = customers.find(c => c.id === value);

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === parseInt(customerId));
    if (customer) {
      onValueChange(customer.id, customer);
    }
    setIsOpen(false);
  };

  const handleAddCustomer = async (customerData: any) => {
    try {
      const newCustomer = await addCustomer(customerData);
      
      toast({
        title: "Cliente criado",
        description: "Cliente criado com sucesso e selecionado para o pedido.",
      });
      
      // Fechar o modal de criação primeiro
      setIsCustomerFormOpen(false);
      
      // Aguardar um pouco para garantir que o modal foi fechado
      setTimeout(() => {
        // Selecionar automaticamente o cliente criado
        onValueChange(newCustomer.id, newCustomer);
        
        // Atualizar lista de clientes em background
        refreshCustomers();
      }, 100);
      
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar cliente.",
        variant: "destructive",
      });
    }
  };

  const handleCreateNewCustomer = () => {
    setIsOpen(false);
    setIsCustomerFormOpen(true);
  };

  return (
    <>
      <div className="space-y-2">
        <Label>Cliente *</Label>
        <div className="flex gap-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start">
                {selectedCustomer ? (
                  <span>{selectedCustomer.name} - {selectedCustomer.phone}</span>
                ) : (
                  <span className="text-muted-foreground">Selecionar cliente...</span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Selecionar Cliente</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {loading ? (
                    <p className="text-center text-muted-foreground py-4">
                      Carregando clientes...
                    </p>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <Button
                        key={customer.id}
                        variant="ghost"
                        className="w-full justify-start h-auto p-3"
                        onClick={() => handleCustomerSelect(customer.id.toString())}
                      >
                        <div className="text-left">
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.phone}</p>
                          <p className="text-xs text-muted-foreground">{customer.address}</p>
                        </div>
                      </Button>
                    ))
                  ) : (
                    <div className="text-center py-4 space-y-2">
                      <p className="text-muted-foreground">
                        Nenhum cliente encontrado
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleCreateNewCustomer}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Criar novo cliente
                      </Button>
                    </div>
                  )}
                </div>
                
                {filteredCustomers.length > 0 && (
                  <div className="border-t pt-3">
                    <Button 
                      variant="outline" 
                      onClick={handleCreateNewCustomer}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar novo cliente
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsCustomerFormOpen(true)}
            title="Criar novo cliente"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Informação adicional para formulários de pedido */}
        {selectedCustomer && (
          <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
            <p><strong>Endereço:</strong> {selectedCustomer.address}</p>
            {selectedCustomer.email && <p><strong>Email:</strong> {selectedCustomer.email}</p>}
          </div>
        )}
      </div>

      <CustomerFormModal
        isOpen={isCustomerFormOpen}
        onClose={() => setIsCustomerFormOpen(false)}
        onSubmit={handleAddCustomer}
      />
    </>
  );
}
