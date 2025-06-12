import React, { useEffect, useState, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useProductsForSale } from '@/hooks/useProductsForSale';
import { Loader2, Search } from "lucide-react";
import { supabase } from '@/lib/supabase';

interface ProductSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  tipoPedido?: 'pronta_entrega' | 'encomenda';
  disabled?: boolean;
}

export function ProductSelect({ 
  value, 
  onValueChange, 
  placeholder = "Selecione um produto", 
  tipoPedido = 'pronta_entrega',
  disabled = false 
}: ProductSelectProps) {
  const { products, loading, error } = useProductsForSale();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Carregar produto selecionado se não estiver na lista principal
  useEffect(() => {
    const loadSelectedProduct = async () => {
      if (value && !products.find(p => p.id.toString() === value)) {
        try {
          const { data: produto, error } = await supabase
            .from('produtos')
            .select(`
              id,
              nome,
              descricao,
              preco_venda,
              preco_custo,
              quantidade_minima,
              categoria,
              unidade_medida,
              tipo_produto,
              imagem_url,
              status,
              estoque:estoque(quantidade_atual, quantidade_pronta_entrega, quantidade_encomenda)
            `)
            .eq('id', parseInt(value))
            .single();

          if (produto && !error) {
            const produtoFormatado = {
              id: parseInt(produto.id) || 0,
              nome: produto.nome || '',
              descricao: produto.descricao || '',
              preco_venda: parseFloat(produto.preco_venda) || 0,
              preco_custo: parseFloat(produto.preco_custo) || 0,
              quantidade_minima: parseInt(produto.quantidade_minima) || 0,
              quantidade_atual: produto.estoque?.[0]?.quantidade_atual || 0,
              quantidade_pronta_entrega: produto.estoque?.[0]?.quantidade_pronta_entrega || 0,
              quantidade_encomenda: produto.estoque?.[0]?.quantidade_encomenda || 0,
              categoria: produto.categoria || '',
              unidade_medida: produto.unidade_medida || 'un',
              tipo_produto: produto.tipo_produto || '',
              imagem_url: produto.imagem_url || null,
              status: produto.status || 'ativo'
            };
            setSelectedProduct(produtoFormatado);
          }
        } catch (error) {
          console.error('Erro ao carregar produto selecionado:', error);
        }
      } else {
        setSelectedProduct(null);
      }
    };

    loadSelectedProduct();
  }, [value, products]);

  // Combinar produtos disponíveis com produto selecionado (se diferente)
  useEffect(() => {
    let combined = [...products];
    
    if (selectedProduct && !products.find(p => p.id === selectedProduct.id)) {
      combined = [selectedProduct, ...products];
    }
    
    setAllProducts(combined);
  }, [products, selectedProduct]);

  // Adicionar suporte ao scroll do mouse
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (scrollContainerRef.current && isOpen) {
        e.preventDefault();
        scrollContainerRef.current.scrollTop += e.deltaY;
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer && isOpen) {
      scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        scrollContainer.removeEventListener('wheel', handleWheel);
      };
    }
  }, [isOpen]);

  // Filtrar produtos baseado na busca
  const filteredProducts = allProducts.filter(product => 
    product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEstoqueDisponivel = (produto: any) => {
    // Para pedidos de Pronta Entrega: mostra APENAS estoque de pronta_entrega
    if (tipoPedido === 'pronta_entrega') {
      return produto.quantidade_pronta_entrega || 0;
    }
    
    // Para pedidos de Encomenda: não mostra limitação de estoque (será produzido)
    return null;
  };

  const getStatusEstoque = (produto: any) => {
    if (tipoPedido === 'encomenda') {
      return "Será produzido";
    }
    
    const estoque = getEstoqueDisponivel(produto);
    if (estoque === 0) {
      return "Sem estoque";
    } else if (estoque <= produto.quantidade_minima) {
      return "Estoque baixo";
    }
    
    return `${estoque} disponível`;
  };

  const isProductDisabled = (produto: any) => {
    // Se o produto está inativo, mostrar mas desabilitar (exceto se já selecionado)
    if (produto.status === 'inativo' && produto.id.toString() !== value) {
      return true;
    }
    
    // Para encomendas, todos os produtos ativos estão disponíveis
    if (tipoPedido === 'encomenda') {
      return false;
    }
    
    // Para pronta entrega, desabilitar se não há estoque
    const estoque = getEstoqueDisponivel(produto);
    return estoque === 0;
  };

  const getProductLabel = (produto: any) => {
    if (produto.status === 'inativo') {
      return `${produto.nome} (INATIVO)`;
    }
    return produto.nome;
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchTerm('');
    }
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando produtos...
          </div>
        </SelectTrigger>
      </Select>
    );
  }

  if (error) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Erro ao carregar produtos" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select 
      value={value || ""} 
      onValueChange={onValueChange} 
      disabled={disabled}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent 
        className="max-h-[400px]"
        position="popper"
        sideOffset={4}
      >
        {/* Campo de busca */}
        <div className="flex items-center px-3 pb-2 border-b">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        
        {/* Lista de produtos com scroll do mouse */}
        <div 
          ref={scrollContainerRef}
          className="max-h-[300px] overflow-y-auto custom-scrollbar mouse-scroll-enabled"
          style={{ 
            scrollBehavior: 'smooth',
            overscrollBehavior: 'contain',
            // Garantir que o scroll do mouse funcione
            touchAction: 'pan-y',
            // Estilizar a scrollbar
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f1f5f9'
          }}
          onWheel={(e) => {
            // Permitir scroll natural do mouse
            e.stopPropagation();
            // Garantir que o evento seja processado
            const container = scrollContainerRef.current;
            if (container) {
              container.scrollTop += e.deltaY * 0.5; // Scroll mais suave
            }
          }}
          onMouseEnter={() => {
            // Focar no container quando o mouse entra para garantir que receba eventos de scroll
            if (scrollContainerRef.current) {
              scrollContainerRef.current.focus();
            }
          }}
          tabIndex={-1} // Permitir foco sem aparecer na navegação por tab
        >
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
            </div>
          ) : (
            filteredProducts.map((product) => {
              const produtoDesabilitado = isProductDisabled(product);
              const statusEstoque = getStatusEstoque(product);
              const isInactive = product.status === 'inativo';
              
              return (
                <SelectItem 
                  key={product.id} 
                  value={product.id.toString()}
                  disabled={produtoDesabilitado}
                  className={`cursor-pointer ${produtoDesabilitado ? "opacity-50" : ""}`}
                >
                  <div className="flex flex-col w-full">
                    <div className="flex justify-between items-center">
                      <span className={`font-medium ${isInactive ? 'text-red-600' : ''}`}>
                        {getProductLabel(product)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        R$ {(Number(product.preco_venda) || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{product.categoria}</span>
                      <span className={`
                        ${isInactive ? 'text-red-600' :
                          tipoPedido === 'encomenda' ? 'text-blue-600' : 
                          statusEstoque === 'Sem estoque' ? 'text-red-600' :
                          statusEstoque === 'Estoque baixo' ? 'text-orange-600' :
                          'text-green-600'}
                      `}>
                        {isInactive ? 'Produto inativo' : statusEstoque}
                        {tipoPedido === 'pronta_entrega' && getEstoqueDisponivel(product) > 0 && !isInactive && 
                          ` ${product.unidade_medida || ''}`
                        }
                      </span>
                    </div>
                  </div>
                </SelectItem>
              );
            })
          )}
        </div>
      </SelectContent>
    </Select>
  );
} 