import type { Request, Response } from "express";
import { storage } from "../storage";

export class ClientService {
  async getAllClients(req: Request, res: Response) {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  }

  async getClientById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const client = await storage.getClient(parseInt(id));
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  }

  async updateClient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedClient = await storage.updateClient(parseInt(id), updates);
      
      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  }

  async createClient(req: Request, res: Response) {
    try {
      const clientData = req.body;
      const newClient = await storage.createClient(clientData);
      res.status(201).json(newClient);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  }

  async deleteClient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await storage.deleteClient(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  }
}