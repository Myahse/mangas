import 'package:flutter/material.dart';

import '../services/support_service.dart';
import '../theme.dart';
import '../widgets/account_page_layout.dart';

class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  int _openFaq = 0;
  int _tab = 0; // 0 faq, 1 ticket

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _subject = TextEditingController();
  final _description = TextEditingController();

  bool _sending = false;
  String? _success;
  String? _error;

  static const _faqs = [
    (
      q: "Je n'arrive pas à me connecter",
      a: 'Vérifiez d’abord votre email/mot de passe, puis essayez de redémarrer l’application. Si le problème continue, envoyez-nous un ticket avec le message d’erreur et votre appareil.',
    ),
    (
      q: 'Une page/chapitre ne charge pas',
      a: 'Essayez de recharger, puis vérifiez votre connexion. Si ça persiste, indiquez le manga et le numéro de chapitre dans un ticket.',
    ),
    (
      q: 'Je veux signaler un bug ou faire une demande',
      a: 'Utilisez l’onglet « Envoyer un ticket ». Plus vous donnez de détails, plus nous pourrons vous aider rapidement.',
    ),
  ];

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _subject.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _submitTicket() async {
    setState(() {
      _error = null;
      _success = null;
    });
    final name = _name.text.trim();
    final email = _email.text.trim();
    final subject = _subject.text.trim();
    final description = _description.text.trim();
    if (name.isEmpty || email.isEmpty || subject.isEmpty || description.isEmpty) {
      setState(() => _error = 'Veuillez remplir tous les champs.');
      return;
    }
    setState(() => _sending = true);
    try {
      final res = await supportService.createTicket(
        name: name,
        email: email,
        subject: subject,
        description: description,
      );
      setState(() {
        _success = 'Ticket créé (#${res['id'] ?? '—'}). Nous vous répondrons par email.';
        _name.clear();
        _email.clear();
        _subject.clear();
        _description.clear();
      });
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AccountPageLayout(
      title: 'Nous contacter',
      lead: 'FAQ, tickets et assistance MangAfric.',
      embedded: widget.embedded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _TabChip(label: 'FAQ', active: _tab == 0, onTap: () => setState(() => _tab = 0)),
              _TabChip(label: 'Envoyer un ticket', active: _tab == 1, onTap: () => setState(() => _tab = 1)),
            ],
          ),
          const SizedBox(height: 16),
          if (_tab == 0) _buildFaq() else _buildTicketForm(),
        ],
      ),
    );
  }

  Widget _buildFaq() {
    return Column(
      children: List.generate(_faqs.length, (i) {
        final faq = _faqs[i];
        final open = _openFaq == i;
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Material(
            color: AppColors.bgWhite,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () => setState(() => _openFaq = open ? -1 : i),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          Expanded(child: Text(faq.q, style: const TextStyle(fontWeight: FontWeight.w800))),
                          Icon(open ? Icons.expand_less : Icons.expand_more, size: 20),
                        ],
                      ),
                    ),
                    if (open)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                        child: Text(faq.a, style: const TextStyle(color: AppColors.textSecondary, height: 1.45)),
                      ),
                  ],
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildTicketForm() {
    return AccountCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Nouveau ticket', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          const SizedBox(height: 14),
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Nom')),
          const SizedBox(height: 12),
          TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
          const SizedBox(height: 12),
          TextField(controller: _subject, decoration: const InputDecoration(labelText: 'Sujet')),
          const SizedBox(height: 12),
          TextField(
            controller: _description,
            minLines: 4,
            maxLines: 8,
            decoration: const InputDecoration(labelText: 'Description', alignLabelWithHint: true),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.accentDark, fontWeight: FontWeight.w600)),
          ],
          if (_success != null) ...[
            const SizedBox(height: 12),
            Text(_success!, style: const TextStyle(color: AppColors.textSecondary, height: 1.4)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _sending ? null : _submitTicket,
            child: Text(_sending ? 'Envoi…' : 'Envoyer'),
          ),
        ],
      ),
    );
  }
}

class _TabChip extends StatelessWidget {
  const _TabChip({required this.label, required this.active, required this.onTap});

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: active ? AppColors.bgWhite : AppColors.bgWhite.withValues(alpha: 0.6),
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: active ? AppColors.border : AppColors.border.withValues(alpha: 0.7)),
          ),
          child: Text(label, style: TextStyle(fontWeight: FontWeight.w700, color: active ? AppColors.textDark : AppColors.textMuted)),
        ),
      ),
    );
  }
}
