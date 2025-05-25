export interface RaindropCollection {
  _id: number;
  title: string;
  count: number;
  color?: string;
  cover?: string[];
  created: string;
  lastUpdate: string;
  public: boolean;
  sort: number;
  view: string;
  access: {
    level: number;
    draggable: boolean;
  };
  user: {
    $id: number;
  };
  parent?: {
    $id: number;
  };
}

export interface Raindrop {
  _id: number;
  collection: {
    $id: number;
  };
  cover?: string;
  created: string;
  domain: string;
  excerpt?: string;
  lastUpdate: string;
  link: string;
  media?: Array<{ link: string }>;
  tags: string[];
  title: string;
  type: 'link' | 'article' | 'image' | 'video' | 'document' | 'audio';
  user: {
    $id: number;
  };
  important?: boolean;
  broken?: boolean;
}

export interface RaindropApiResponse<T> {
  result: boolean;
  items?: T[];
  item?: T;
  error?: string;
  errorMessage?: string;
}

export interface RaindropApiConfig {
  token: string;
  baseUrl?: string;
}

