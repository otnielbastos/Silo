import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StockMovement } from "@/hooks/useStockMovements";
import { useProducts } from "@/hooks/useProducts";

interface StockMovementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (movement: Omit<StockMovement, 'id'>) => void;
  movement?: StockMovement;
}

const movementTypes = [
  { value: "entrada", label: "Entrada" },
  { value: "saida", label: "Saída" },
  { value: "ajuste", label: "Ajuste" }
];

const reasonOptions = [
  "Compra do fornecedor",
  "Venda",
  "Perda/Quebra",
  "Devolução",
  "Ajuste de inventário",
  "Transferência",
  "Produção",
  "Outros"
];

export function StockMovementFormModal({ isOpen, onClose, onSubmit, movement }: StockMovementFormModalProps) {
  const { products } = useProducts();
  const [formData, setFormData] = useState({
    produto_id: "",
    tipo_movimento: "entrada" as StockMovement['tipo_movimento'],
    quantidade: "",
    motivo: "",
    valor: "",
    documento_referencia: "",
    data_fabricacao: "",
    data_validade: "",
    observacao: "",
  });

  useEffect(() => {
    if (movement) {
      setFormData({
        produto_id: movement.produto_id.toString(),
        tipo_movimento: movement.tipo_movimento,
        quantidade: movement.quantidade.toString(),
        motivo: movement.motivo,
        valor: movement.valor?.toString() || "",
        documento_referencia: movement.documento_referencia || "",
        data_fabricacao: movement.data_fabricacao || "",
        data_validade: movement.data_validade || "",
        observacao: movement.observacao || "",
      });
    } else {
      setFormData({
        produto_id: "",
        tipo_movimento: "entrada",
        quantidade: "",
        motivo: "",
        valor: "",
        documento_referencia: "",
        data_fabricacao: "",
        data_validade: "",
        observacao: "",
      });
    }
  }, [movement, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.produto_id) {
      alert("Por favor, selecione um produto.");
      return;
    }

    const movementData: Omit<StockMovement, 'id'> = {
      produto_id: parseInt(formData.produto_id),
      tipo_movimento: formData.tipo_movimento,
      quantidade: parseInt(formData.quantidade),
      motivo: formData.motivo,
      valor: formData.valor ? parseFloat(formData.valor) : undefined,
      documento_referencia: formData.documento_referencia || undefined,
      data_fabricacao: formData.data_fabricacao || undefined,
      data_validade: formData.data_validade || undefined,
      observacao: formData.observacao || undefined,
      // Campos que virão do backend
      produto_nome: "",
      unidade_medida: "",
      categoria: "",
      data_movimentacao: "",
    };

    onSubmit(movementData);
    onClose();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Lógica automática para calcular validade de nhoques
      if (field === 'data_fabricacao' && newData.motivo === 'Produção') {
        const selectedProduct = products.find(p => p.id === parseInt(newData.produto_id));
        if (selectedProduct && selectedProduct.nome.toLowerCase().includes('nhoque') && value) {
          const fabricacao = new Date(value);
          const validade = new Date(fabricacao);
          validade.setMonth(validade.getMonth() + 3);
          newData.data_validade = validade.toISOString().split('T')[0];
        }
      }

      return newData;
    });
  };

  const selectedProduct = products.find(p => p.id === parseInt(formData.produto_id));
  const isNhoque = selectedProduct?.nome.toLowerCase().includes('nhoque');
  const isProducao = formData.motivo === 'Produção';
  const shouldShowDataFabricacao = isProducao;
  const shouldAutoCalculateValidade = isNhoque && isProducao;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {movement ? 'Editar Movimentação' : 'Nova Movimentação'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="produto_id">Produto *</Label>
            <Select value={formData.produto_id} onValueChange={(value) => handleChange('produto_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.nome} - {product.categoria}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProduct && (
              <p className="text-xs text-gray-500 mt-1">
                Estoque atual: {selectedProduct.quantidade_atual} {selectedProduct.unidade_medida}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo_movimento">Tipo *</Label>
              <Select value={formData.tipo_movimento} onValueChange={(value) => handleChange('tipo_movimento', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {movementTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                value={formData.quantidade}
                onChange={(e) => handleChange('quantidade', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="motivo">Motivo *</Label>
            <Select value={formData.motivo} onValueChange={(value) => handleChange('motivo', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campos de Data de Fabricação e Validade */}
          {shouldShowDataFabricacao && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_fabricacao">Data de Fabricação *</Label>
                <Input
                  id="data_fabricacao"
                  type="date"
                  value={formData.data_fabricacao}
                  onChange={(e) => handleChange('data_fabricacao', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="data_validade">
                  Data de Validade {shouldAutoCalculateValidade && "(Automática)"}
                </Label>
                <Input
                  id="data_validade"
                  type="date"
                  value={formData.data_validade}
                  onChange={(e) => handleChange('data_validade', e.target.value)}
                  disabled={shouldAutoCalculateValidade}
                  className={shouldAutoCalculateValidade ? "bg-gray-100" : ""}
                />
                {shouldAutoCalculateValidade && (
                  <p className="text-xs text-blue-600 mt-1">
                    Calculada automaticamente: 3 meses após fabricação
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => handleChange('valor', e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <Label htmlFor="documento_referencia">Doc. Referência</Label>
              <Input
                id="documento_referencia"
                value={formData.documento_referencia}
                onChange={(e) => handleChange('documento_referencia', e.target.value)}
                placeholder="Ex: NF-001, Pedido #123"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="observacao">Observações</Label>
            <Textarea
              id="observacao"
              value={formData.observacao}
              onChange={(e) => handleChange('observacao', e.target.value)}
              placeholder="Observações sobre a movimentação..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
              {movement ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
