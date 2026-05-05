import { Component, ElementRef, Input, ViewChild } from "@angular/core";
import { finalize } from "rxjs/operators";
import { ChatbotService } from "src/app/services/chatbot.service";

interface ChatMessage {
  from: "user" | "bot";
  text: string;
  typing?: boolean;
}

@Component({
  selector: "app-chatbot",
  templateUrl: "./chatbot.component.html",
  styleUrls: ["./chatbot.component.scss"],
})
export class ChatbotComponent {
  @Input() compact = false;
  @ViewChild("messagesContainer") messagesContainer!: ElementRef<HTMLDivElement>;

  isOpen = false;
  loading = false;
  input = "";
  messages: ChatMessage[] = [
    {
      from: "bot",
      text: "Bonjour Je suis votre assistant intelligent de gestion des interventions.Posez-moi votre question, je vais analyser vos données et vous proposer la meilleure décision.",
    },
  ];

  constructor(private chatbotService: ChatbotService) {}

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    setTimeout(() => this.scrollToBottom(), 120);
  }

  closeChat(): void {
    this.isOpen = false;
  }

  send(): void {
    const message = this.input.trim();
    if (!message || this.loading) {
      return;
    }

    this.messages.push({ from: "user", text: message });
    this.input = "";
    this.loading = true;
    this.messages.push({ from: "bot", text: "typing...", typing: true });
    this.scrollToBottom();

    this.chatbotService
      .sendMessage(message)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.replaceTypingMessage(response?.message || "Aucune reponse du chatbot.");
        },
        error: () => {
          this.replaceTypingMessage("Erreur serveur. Veuillez reessayer.");
        },
      });
  }

  onEnter(event: KeyboardEvent): void {
    event.preventDefault();
    this.send();
  }

  private replaceTypingMessage(text: string): void {
    const safeText = String(text || "").trim() || "Aucune reponse du chatbot.";
    const index = this.messages.findIndex((message) => message.typing);
    if (index !== -1) {
      this.messages.splice(index, 1, { from: "bot", text: safeText });
    } else {
      const lastBot = [...this.messages].reverse().find((message) => message.from === "bot");
      if (lastBot && lastBot.text === safeText) {
        this.scrollToBottom();
        return;
      }
      this.messages.push({ from: "bot", text: safeText });
    }
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    if (!this.messagesContainer) return;
    setTimeout(() => {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }, 30);
  }
}
