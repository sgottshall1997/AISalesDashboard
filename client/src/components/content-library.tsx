import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Clock, Tag, FileText, Star } from "lucide-react";
import { format } from "date-fns";

interface ContentItem {
  id: string;
  title: string;
  type: "one-pager" | "email" | "summary" | "qa";
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isFavorite: boolean;
}

interface ContentLibraryProps {
  onSelectContent?: (content: ContentItem) => void;
  className?: string;
}

export function ContentLibrary({ onSelectContent, className = "" }: ContentLibraryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "type" | "title">("date");
  const [contents, setContents] = useState<ContentItem[]>([]);

  // Load content from localStorage on mount
  useEffect(() => {
    const savedContents = localStorage.getItem("ai-content-library");
    if (savedContents) {
      try {
        const parsed = JSON.parse(savedContents).map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        }));
        setContents(parsed);
      } catch (error) {
        console.error("Failed to load content library:", error);
      }
    }
  }, []);

  // Save to localStorage whenever contents change
  useEffect(() => {
    localStorage.setItem("ai-content-library", JSON.stringify(contents));
  }, [contents]);

  const filteredContents = contents
    .filter(item => {
      const matchesSearch = 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesTag = !selectedTag || item.tags.includes(selectedTag);
      
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        case "type":
          return a.type.localeCompare(b.type);
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const allTags = Array.from(new Set(contents.flatMap(item => item.tags)));

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "one-pager": return "📄";
      case "email": return "📧";
      case "summary": return "📝";
      case "qa": return "❓";
      default: return "📄";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "one-pager": return "bg-blue-100 text-blue-800";
      case "email": return "bg-green-100 text-green-800";
      case "summary": return "bg-purple-100 text-purple-800";
      case "qa": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const toggleFavorite = (id: string) => {
    setContents(prev => prev.map(item => 
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    ));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Content Library
        </CardTitle>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="date">Sort by Date</option>
              <option value="type">Sort by Type</option>
              <option value="title">Sort by Title</option>
            </select>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedTag === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTag(null)}
            >
              All
            </Button>
            {allTags.map(tag => (
              <Button
                key={tag}
                variant={selectedTag === tag ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTag(tag)}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          {filteredContents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {contents.length === 0 ? "No saved content yet" : "No content matches your search"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContents.map(item => (
                <Card 
                  key={item.id} 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSelectContent?.(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getTypeIcon(item.type)}</span>
                        <h4 className="font-medium truncate">{item.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.id);
                          }}
                        >
                          <Star className={`h-4 w-4 ${item.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        </Button>
                        <Badge className={getTypeColor(item.type)}>
                          {item.type}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.content.substring(0, 120)}...
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(item.updatedAt, "MMM d, yyyy")}
                      </div>
                      
                      <div className="flex gap-1">
                        {item.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{item.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Auto-save hook for content inputs
export function useAutoSave(content: string, key: string, delay: number = 2000) {
  useEffect(() => {
    if (!content.trim()) return;
    
    const timeoutId = setTimeout(() => {
      localStorage.setItem(`autosave-${key}`, content);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [content, key, delay]);

  const loadSaved = (): string => {
    return localStorage.getItem(`autosave-${key}`) || "";
  };

  const clearSaved = () => {
    localStorage.removeItem(`autosave-${key}`);
  };

  return { loadSaved, clearSaved };
}

// Function to save content to library
export function saveToLibrary(
  title: string,
  type: ContentItem["type"],
  content: string,
  tags: string[] = []
): void {
  const item: ContentItem = {
    id: Date.now().toString(),
    title: title || `${type} - ${format(new Date(), "MMM d, yyyy")}`,
    type,
    content,
    tags,
    createdAt: new Date(),
    updatedAt: new Date(),
    isFavorite: false,
  };

  const existing = JSON.parse(localStorage.getItem("ai-content-library") || "[]");
  const updated = [item, ...existing];
  localStorage.setItem("ai-content-library", JSON.stringify(updated));
}