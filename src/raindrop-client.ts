import { RaindropCollection, Raindrop, RaindropApiResponse, RaindropApiConfig } from './types.js';

export class RaindropClient {
  private config: RaindropApiConfig;
  private baseUrl: string;

  constructor(config: RaindropApiConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.raindrop.io/rest/v1';
  }

  private async makeRequest<T>(endpoint: string, method: string = 'GET', body?: any): Promise<RaindropApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      if (response.status === 401) {
        errorMessage += ' - Unauthorized. Please check your API token.';
      } else if (response.status === 403) {
        errorMessage += ' - Forbidden. You may not have access to this resource.';
      } else if (response.status === 404) {
        errorMessage += ' - Not found.';
      }
      
      try {
        const errorBody = await response.text();
        if (errorBody) {
          errorMessage += ` Response: ${errorBody}`;
        }
      } catch {
        // Ignore errors when reading response body
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as RaindropApiResponse<T>;
  }

  async getAllCollections(): Promise<RaindropCollection[]> {
    const rootCollections = await this.makeRequest<RaindropCollection>('/collections');
    const childCollections = await this.makeRequest<RaindropCollection>('/collections/childrens');
    
    const allCollections: RaindropCollection[] = [];
    
    if (rootCollections.items) {
      allCollections.push(...rootCollections.items);
    }
    
    if (childCollections.items) {
      allCollections.push(...childCollections.items);
    }
    
    return allCollections;
  }

  async findCollectionByTitle(title: string): Promise<RaindropCollection | null> {
    const collections = await this.getAllCollections();
    return collections.find(collection => collection.title === title) || null;
  }

  async getRaindrops(collectionId: number, limit?: number): Promise<Raindrop[]> {
    let endpoint = `/raindrops/${collectionId}`;
    
    if (limit) {
      endpoint += `?perpage=${limit}`;
    }
    
    const response = await this.makeRequest<Raindrop>(endpoint);
    return response.items || [];
  }

  async getBookmarkUrls(collectionTitle: string, limit: number = 5): Promise<string[]> {
    const collection = await this.findCollectionByTitle(collectionTitle);
    
    if (!collection) {
      throw new Error(`Collection "${collectionTitle}" not found`);
    }
    
    const raindrops = await this.getRaindrops(collection._id, limit);
    return raindrops.map(raindrop => raindrop.link);
  }

  async createCollection(title: string, view: string = 'list'): Promise<RaindropCollection> {
    const body = {
      title,
      view
    };
    
    const response = await this.makeRequest<RaindropCollection>('/collection', 'POST', body);
    
    if (!response.item) {
      throw new Error(`Failed to create collection "${title}"`);
    }
    
    return response.item;
  }

  async findOrCreateCollection(title: string): Promise<RaindropCollection> {
    const existingCollection = await this.findCollectionByTitle(title);
    
    if (existingCollection) {
      return existingCollection;
    }
    
    return await this.createCollection(title);
  }

  async moveRaindropToCollection(raindropId: number, targetCollectionId: number): Promise<Raindrop> {
    const body = {
      collection: {
        $id: targetCollectionId
      }
    };
    
    const response = await this.makeRequest<Raindrop>(`/raindrop/${raindropId}`, 'PUT', body);
    
    if (!response.item) {
      throw new Error(`Failed to move raindrop ${raindropId} to collection ${targetCollectionId}`);
    }
    
    return response.item;
  }

  async moveBookmarksToCollection(sourceCollectionTitle: string, targetCollectionTitle: string, limit: number = 5): Promise<Raindrop[]> {
    // Find source collection
    const sourceCollection = await this.findCollectionByTitle(sourceCollectionTitle);
    if (!sourceCollection) {
      throw new Error(`Source collection "${sourceCollectionTitle}" not found`);
    }

    // Find or create target collection
    const targetCollection = await this.findOrCreateCollection(targetCollectionTitle);

    // Get raindrops from source collection
    const raindrops = await this.getRaindrops(sourceCollection._id, limit);
    
    if (raindrops.length === 0) {
      console.log(`No bookmarks found in "${sourceCollectionTitle}" to move.`);
      return [];
    }

    // Move each raindrop to target collection
    const movedRaindrops: Raindrop[] = [];
    
    for (const raindrop of raindrops) {
      try {
        const movedRaindrop = await this.moveRaindropToCollection(raindrop._id, targetCollection._id);
        movedRaindrops.push(movedRaindrop);
        console.log(`✅ Moved "${raindrop.title}" to "${targetCollectionTitle}"`);
      } catch (error) {
        console.error(`❌ Failed to move "${raindrop.title}":`, error);
      }
    }
    
    return movedRaindrops;
  }
}