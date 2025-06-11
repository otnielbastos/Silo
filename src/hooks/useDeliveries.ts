
import { useState } from "react";

export interface Delivery {
  id: number;
  orderId: string;
  customer: string;
  phone: string;
  address: string;
  neighborhood: string;
  deliveryPerson: string;
  status: "Pendente" | "A caminho" | "Entregue" | "Não entregue";
  estimatedTime: string;
  total: number;
  paymentMethod: string;
  notes?: string;
  deliveryDate?: string;
}

export function useDeliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([
    {
      id: 1,
      orderId: "#001",
      customer: "João Silva",
      phone: "(11) 99999-1234",
      address: "Rua das Flores, 123 - Centro",
      neighborhood: "Centro",
      deliveryPerson: "Carlos Santos",
      status: "A caminho",
      estimatedTime: "12:30",
      total: 45.90,
      paymentMethod: "Cartão na entrega",
      notes: "Apartamento 302, interfone 12",
    },
    {
      id: 2,
      orderId: "#002",
      customer: "Maria Santos",
      phone: "(11) 99999-5678",
      address: "Av. Principal, 456 - Jardim",
      neighborhood: "Jardim",
      deliveryPerson: "Roberto Lima",
      status: "Entregue",
      estimatedTime: "11:45",
      total: 78.50,
      paymentMethod: "PIX",
      notes: "Casa amarela com portão azul",
    },
  ]);

  const addDelivery = (delivery: Omit<Delivery, 'id'>) => {
    const newDelivery: Delivery = {
      ...delivery,
      id: Math.max(...deliveries.map(d => d.id), 0) + 1,
    };
    setDeliveries(prev => [...prev, newDelivery]);
  };

  const updateDelivery = (id: number, delivery: Omit<Delivery, 'id'>) => {
    setDeliveries(prev => prev.map(d => 
      d.id === id ? { ...delivery, id } : d
    ));
  };

  const deleteDelivery = (id: number) => {
    setDeliveries(prev => prev.filter(d => d.id !== id));
  };

  const getDelivery = (id: number) => {
    return deliveries.find(d => d.id === id);
  };

  return {
    deliveries,
    addDelivery,
    updateDelivery,
    deleteDelivery,
    getDelivery,
  };
}
