import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Order } from "@/hooks/useOrders";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentData: {
    status_pagamento?: "pendente" | "pago" | "parcial";
    valor_pago?: number;
    observacoes_pagamento?: string;
  }) => void;
  order?: Order;
}

const paymentStatusOptions = [
  { value: "pendente", label: "Pendente" },
  { value: "parcial", label: "Pagamento Parcial" },
  { value: "pago", label: "Pago Integralmente" }
];

export function PaymentModal({ isOpen, onClose, onSubmit, order }: PaymentModalProps) {
  const [formData, setFormData] = useState({
    status_pagamento: "pendente" as "pendente" | "pago" | "parcial",
    valor_pago: 0,
    observacoes_pagamento: "",
  });

  useEffect(() => {
    if (order) {
      setFormData({
        status_pagamento: order.paymentStatus || "pendente",
        valor_pago: order.amountPaid || 0,
        observacoes_pagamento: order.paymentNotes || "",
      });
    }
  }, [order, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // Se o status foi alterado para "pago", preencher automaticamente o valor total
      if (field === 'status_pagamento' && value === 'pago' && order) {
        newData.valor_pago = order.total;
      }
      
      // Se o status foi alterado para "pendente", zerar o valor pago
      if (field === 'status_pagamento' && value === 'pendente') {
        newData.valor_pago = 0;
      }
      
      // Se o valor foi alterado, ajustar automaticamente o status
      if (field === 'valor_pago' && order) {
        const valorPago = typeof value === 'number' ? value : parseFloat(value.toString()) || 0;
        if (valorPago === 0) {
          newData.status_pagamento = 'pendente';
        } else if (valorPago >= order.total) {
          newData.status_pagamento = 'pago';
          newData.valor_pago = order.total; // Garantir que não ultrapasse o total
        } else {
          newData.status_pagamento = 'parcial';
        }
      }
      
      return newData;
    });
  };

  const remainingAmount = order ? order.total - (formData.valor_pago || 0) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Controle de Pagamento - {order?.id}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {order && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Cliente:</span>
                <span>{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Valor Total:</span>
                <span className="font-bold text-green-600">R$ {order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Método:</span>
                <span>{order.paymentMethod}</span>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="status_pagamento">Status do Pagamento</Label>
            <Select 
              value={formData.status_pagamento} 
              onValueChange={(value) => handleChange('status_pagamento', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="valor_pago">Valor Pago</Label>
              {order && formData.status_pagamento !== 'pago' && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleChange('valor_pago', order.total)}
                  className="text-xs h-6 px-2"
                >
                  Pagar Total
                </Button>
              )}
            </div>
            <Input
              id="valor_pago"
              type="number"
              step="0.01"
              min="0"
              max={order?.total || 0}
              value={formData.valor_pago}
              onChange={(e) => handleChange('valor_pago', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className={formData.status_pagamento === 'pago' ? 'bg-green-50 border-green-200' : ''}
            />
            {order && remainingAmount > 0 && formData.status_pagamento !== 'pago' && (
              <p className="text-sm text-gray-600 mt-1">
                Restante: R$ {remainingAmount.toFixed(2)}
              </p>
            )}
            {order && formData.status_pagamento === 'pago' && formData.valor_pago === order.total && (
              <p className="text-sm text-green-600 mt-1">
                ✅ Pagamento integral confirmado
              </p>
            )}
            {order && formData.status_pagamento === 'parcial' && formData.valor_pago > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                💰 Pagamento parcial de R$ {formData.valor_pago.toFixed(2)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="observacoes_pagamento">Observações do Pagamento</Label>
            <Textarea
              id="observacoes_pagamento"
              value={formData.observacoes_pagamento}
              onChange={(e) => handleChange('observacoes_pagamento', e.target.value)}
              placeholder="Observações sobre o pagamento..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
              Salvar Pagamento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 