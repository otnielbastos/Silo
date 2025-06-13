import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Users,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  PagePermission, 
  ActionPermission, 
  PermissionSet,
  PerfilPermissoes,
  DEFAULT_PAGE_ACTIONS,
  PAGE_LABELS,
  ACTION_LABELS,
  PERFIS_PADRAO
} from '@/types/permissions';
import { supabaseUsuarios } from '@/services/supabaseUsuarios';

interface PermissionsManagerProps {
  onClose?: () => void;
}

export const PermissionsManager: React.FC<PermissionsManagerProps> = ({ onClose }) => {
  const [perfis, setPerfis] = useState<PerfilPermissoes[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPerfil, setEditingPerfil] = useState<PerfilPermissoes | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Estado do formulário
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    permissoes: {
      pages: [] as PagePermission[],
      actions: {} as Partial<Record<PagePermission, ActionPermission[]>>
    }
  });

  const loadPerfis = async () => {
    try {
      setLoading(true);
      const response = await supabaseUsuarios.buscarPerfis();
      if (response.success) {
        // Garantir que cada perfil tenha a estrutura de permissões correta
        const perfisComPermissoes = response.data.map((perfil: any) => ({
          ...perfil,
          permissoes: perfil.permissoes || {
            pages: [],
            actions: {}
          }
        }));
        setPerfis(perfisComPermissoes);
      }
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar perfis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageToggle = (page: PagePermission, checked: boolean) => {
    const currentPages = formData.permissoes?.pages || [];
    const newPages = checked 
      ? [...currentPages, page]
      : currentPages.filter(p => p !== page);

    const newActions = { ...(formData.permissoes?.actions || {}) };
    
    if (checked) {
      // Adicionar ação 'visualizar' por padrão
      newActions[page] = ['visualizar'];
    } else {
      // Remover todas as ações da página
      delete newActions[page];
    }

    setFormData({
      ...formData,
      permissoes: {
        pages: newPages,
        actions: newActions
      }
    });
  };

  const handleActionToggle = (page: PagePermission, action: ActionPermission, checked: boolean) => {
    const currentActions = formData.permissoes?.actions?.[page] || [];
    
    let newActions: ActionPermission[];
    if (checked) {
      newActions = [...currentActions, action];
    } else {
      newActions = currentActions.filter(a => a !== action);
    }

    // Garantir que 'visualizar' sempre esteja presente se há outras ações
    if (newActions.length > 0 && !newActions.includes('visualizar')) {
      newActions.unshift('visualizar');
    }

    setFormData({
      ...formData,
      permissoes: {
        ...(formData.permissoes || { pages: [], actions: {} }),
        actions: {
          ...(formData.permissoes?.actions || {}),
          [page]: newActions
        }
      }
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.nome.trim()) {
        toast({
          title: "Erro",
          description: "Nome do perfil é obrigatório",
          variant: "destructive"
        });
        return;
      }

      console.log('🔄 Salvando perfil:', {
        editingPerfil: editingPerfil?.id,
        formData
      });

      if (editingPerfil) {
        // Atualizar perfil existente
        const response = await supabaseUsuarios.atualizarPerfil(editingPerfil.id, {
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim(),
          permissoes: formData.permissoes
        });

        if (response.success) {
          toast({
            title: "Sucesso",
            description: "Perfil atualizado com sucesso"
          });
        }
      } else {
        // Criar novo perfil
        const response = await supabaseUsuarios.criarPerfil({
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim(),
          permissoes: formData.permissoes
        });

        if (response.success) {
          toast({
            title: "Sucesso",
            description: "Perfil criado com sucesso"
          });
        }
      }

      setIsDialogOpen(false);
      resetForm();
      loadPerfis();
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar perfil",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (perfil: PerfilPermissoes) => {
    setEditingPerfil(perfil);
    setFormData({
      nome: perfil.nome,
      descricao: perfil.descricao,
      permissoes: perfil.permissoes || {
        pages: [],
        actions: {}
      }
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (perfilId: number) => {
    if (confirm('Tem certeza que deseja excluir este perfil?')) {
      try {
        console.log('🗑️ Excluindo perfil ID:', perfilId);
        
        const response = await supabaseUsuarios.excluirPerfil(perfilId);
        
        if (response.success) {
          toast({
            title: "Sucesso",
            description: "Perfil excluído com sucesso"
          });
          loadPerfis();
        }
      } catch (error: any) {
        console.error('Erro ao excluir perfil:', error);
        toast({
          title: "Erro",
          description: error.message || "Erro ao excluir perfil",
          variant: "destructive"
        });
      }
    }
  };

  const resetForm = () => {
    setEditingPerfil(null);
    setFormData({
      nome: '',
      descricao: '',
      permissoes: {
        pages: [],
        actions: {} as Partial<Record<PagePermission, ActionPermission[]>>
      }
    });
  };

  const createDefaultProfiles = async () => {
    try {
      console.log('🏗️ Criando perfis padrão...');
      
      let perfisCriados = 0;
      
      // Criar cada perfil padrão
      for (const perfilPadrao of PERFIS_PADRAO) {
        // Verificar se o perfil já existe
        const perfilExistente = perfis.find(p => p.nome === perfilPadrao.nome);
        if (!perfilExistente) {
          console.log('Criando perfil:', perfilPadrao.nome);
          await supabaseUsuarios.criarPerfil({
            nome: perfilPadrao.nome,
            descricao: perfilPadrao.descricao,
            permissoes: perfilPadrao.permissoes
          });
          perfisCriados++;
        }
      }
      
      toast({
        title: "Sucesso",
        description: perfisCriados > 0 
          ? `${perfisCriados} perfis padrão criados com sucesso`
          : "Todos os perfis padrão já existem"
      });
      loadPerfis();
    } catch (error: any) {
      console.error('Erro ao criar perfis padrão:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar perfis padrão",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadPerfis();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Gerenciamento de Permissões
          </h2>
          <p className="text-muted-foreground">
            Configure as permissões de acesso para cada perfil de usuário
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={createDefaultProfiles}>
            <Settings className="h-4 w-4 mr-2" />
            Criar Perfis Padrão
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Perfil
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>
                  {editingPerfil ? 'Editar Perfil' : 'Novo Perfil'}
                </DialogTitle>
                <DialogDescription>
                  Configure as permissões de acesso para este perfil
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-6 p-1">
                  {/* Informações básicas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nome">Nome do Perfil</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Ex: Administrador"
                      />
                    </div>
                    <div>
                      <Label htmlFor="descricao">Descrição</Label>
                      <Input
                        id="descricao"
                        value={formData.descricao}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                        placeholder="Ex: Acesso total ao sistema"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Permissões por página */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Permissões por Página</h3>
                    <div className="space-y-4">
                      {Object.entries(PAGE_LABELS).map(([page, label]) => {
                        const pageKey = page as PagePermission;
                        const hasPageAccess = (formData.permissoes?.pages || []).includes(pageKey);
                        const pageActions = formData.permissoes?.actions?.[pageKey] || [];
                        const availableActions = DEFAULT_PAGE_ACTIONS[pageKey];

                        return (
                          <Card key={page} className={hasPageAccess ? 'border-primary' : ''}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`page-${page}`}
                                  checked={hasPageAccess}
                                  onCheckedChange={(checked) => 
                                    handlePageToggle(pageKey, checked as boolean)
                                  }
                                />
                                <Label htmlFor={`page-${page}`} className="text-base font-medium">
                                  {label}
                                </Label>
                              </div>
                            </CardHeader>
                            
                            {hasPageAccess && (
                              <CardContent className="pt-0">
                                <div className="grid grid-cols-4 gap-2">
                                  {availableActions.map((action) => (
                                    <div key={action} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`${page}-${action}`}
                                        checked={pageActions.includes(action)}
                                        onCheckedChange={(checked) =>
                                          handleActionToggle(pageKey, action, checked as boolean)
                                        }
                                        disabled={action === 'visualizar'} // Visualizar sempre obrigatório
                                      />
                                      <Label 
                                        htmlFor={`${page}-${action}`}
                                        className="text-sm"
                                      >
                                        {ACTION_LABELS[action]}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de perfis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">
            Carregando perfis...
          </div>
        ) : perfis.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum perfil encontrado</p>
            <Button className="mt-4" onClick={createDefaultProfiles}>
              Criar Perfis Padrão
            </Button>
          </div>
        ) : (
          perfis.map((perfil) => (
            <Card key={perfil.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{perfil.nome}</CardTitle>
                  <Badge variant={perfil.ativo ? 'default' : 'secondary'}>
                    {perfil.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <CardDescription>{perfil.descricao}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Páginas com Acesso:</p>
                    <div className="flex flex-wrap gap-1">
                      {(perfil.permissoes?.pages || []).map((page) => (
                        <Badge key={page} variant="outline" className="text-xs">
                          {PAGE_LABELS[page]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(perfil)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(perfil.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}; 