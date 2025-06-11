
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, Search, MapPin, Clock, User, Edit, Trash2 } from "lucide-react";
import { useDeliveries } from "@/hooks/useDeliveries";
import { DeliveryFormModal } from "@/components/DeliveryFormModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

export function Deliveries() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<number | null>(null);
  const [deletingDelivery, setDeletingDelivery] = useState<number | null>(null);
  
  const { deliveries, addDelivery, updateDelivery, deleteDelivery, getDelivery } = useDeliveries();

  const handleEdit = (id: number) => {
    setEditingDelivery(id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeletingDelivery(id);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = (deliveryData: any) => {
    if (editingDelivery) {
      updateDelivery(editingDelivery, deliveryData);
    } else {
      addDelivery(deliveryData);
    }
    setEditingDelivery(null);
  };

  const handleDeleteConfirm = () => {
    if (deletingDelivery) {
      deleteDelivery(deletingDelivery);
      setDeletingDelivery(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Entregue": return "bg-green-100 text-green-800 border-green-200";
      case "A caminho": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Pendente": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Não entregue": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Entregue": return "✅";
      case "A caminho": return "🚚";
      case "Pendente": return "⏳";
      case "Não entregue": return "❌";
      default: return "📦";
    }
  };

  const filteredDeliveries = deliveries.filter(delivery =>
    delivery.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.deliveryPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.orderId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Truck className="w-8 h-8" />
            Entregas
          </h2>
          <p className="text-gray-600">Gerencie todas as entregas da loja</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Nova Entrega
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por cliente, bairro, entregador ou pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Todas</Button>
              <Button variant="outline">Pendentes</Button>
              <Button variant="outline">A Caminho</Button>
              <Button variant="outline">Centro</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries List */}
      <div className="grid gap-4">
        {filteredDeliveries.map((delivery) => (
          <Card key={delivery.id} className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                      <h3 className="font-semibold text-gray-800">
                        {delivery.customer} - Pedido {delivery.orderId}
                      </h3>
                      <Badge className={`w-fit ${getStatusColor(delivery.status)}`}>
                        {getStatusIcon(delivery.status)} {delivery.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{delivery.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Previsão: {delivery.estimatedTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Entregador: {delivery.deliveryPerson}</span>
                      </div>
                      <div>
                        <strong>Pagamento:</strong> {delivery.paymentMethod}
                      </div>
                      {delivery.notes && (
                        <div className="sm:col-span-2">
                          <strong>Observações:</strong> {delivery.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">R$ {delivery.total.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Valor Total</p>
                  </div>
                  
                  <div className="flex gap-2">
                    {delivery.status === "Pendente" && (
                      <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                        Iniciar Entrega
                      </Button>
                    )}
                    {delivery.status === "A caminho" && (
                      <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                        Confirmar Entrega
                      </Button>
                    )}
                    {delivery.status === "Não entregue" && (
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                        Reagendar
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleEdit(delivery.id)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(delivery.id)}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{deliveries.length}</p>
            <p className="text-sm text-gray-600">Total Hoje</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{deliveries.filter(d => d.status === "Pendente").length}</p>
            <p className="text-sm text-gray-600">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{deliveries.filter(d => d.status === "A caminho").length}</p>
            <p className="text-sm text-gray-600">A Caminho</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{deliveries.filter(d => d.status === "Entregue").length}</p>
            <p className="text-sm text-gray-600">Entregues</p>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <DeliveryFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingDelivery(null);
        }}
        onSubmit={handleFormSubmit}
        delivery={editingDelivery ? getDelivery(editingDelivery) : undefined}
      />

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingDelivery(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemName={deletingDelivery ? getDelivery(deletingDelivery)?.customer || '' : ''}
      />
    </div>
  );
}
