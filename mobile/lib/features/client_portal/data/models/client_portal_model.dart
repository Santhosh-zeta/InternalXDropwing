class ClientProject {
  final int id;
  final String name;
  final String status; // 'active' | 'completed' | 'archived'
  final double progress; // 0-100
  final String? description;
  final List<String> deliverables;
  final List<ClientTeamMember> teamMembers;

  ClientProject({
    required this.id,
    required this.name,
    required this.status,
    required this.progress,
    this.description,
    this.deliverables = const [],
    this.teamMembers = const [],
  });

  factory ClientProject.fromJson(Map<String, dynamic> json) {
    return ClientProject(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      status: json['status'] ?? 'active',
      progress: (json['progress'] ?? 0).toDouble(),
      description: json['description'],
      deliverables: List<String>.from(json['deliverables'] ?? []),
      teamMembers: (json['team_members'] as List?)
              ?.map((m) => ClientTeamMember.fromJson(m as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class ClientDeliverable {
  final int id;
  final String name;
  final String type; // 'document' | 'code' | 'design' | 'other'
  final DateTime dueDate;
  final String status; // 'pending' | 'completed' | 'overdue'
  final String? description;

  ClientDeliverable({
    required this.id,
    required this.name,
    required this.type,
    required this.dueDate,
    required this.status,
    this.description,
  });

  factory ClientDeliverable.fromJson(Map<String, dynamic> json) {
    return ClientDeliverable(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      type: json['type'] ?? 'other',
      dueDate: DateTime.parse(json['due_date'] ?? DateTime.now().toIso8601String()),
      status: json['status'] ?? 'pending',
      description: json['description'],
    );
  }
}

class ClientInvoice {
  final int id;
  final String invoiceNumber;
  final double amount;
  final DateTime date;
  final String status; // 'paid' | 'pending' | 'overdue'
  final String? pdfUrl;
  final String? description;

  ClientInvoice({
    required this.id,
    required this.invoiceNumber,
    required this.amount,
    required this.date,
    required this.status,
    this.pdfUrl,
    this.description,
  });

  factory ClientInvoice.fromJson(Map<String, dynamic> json) {
    return ClientInvoice(
      id: json['id'] ?? 0,
      invoiceNumber: json['invoice_number'] ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
      date: DateTime.parse(json['date'] ?? DateTime.now().toIso8601String()),
      status: json['status'] ?? 'pending',
      pdfUrl: json['pdf_url'],
      description: json['description'],
    );
  }
}

class ClientTeamMember {
  final int id;
  final String name;
  final String? email;
  final String? role;

  ClientTeamMember({
    required this.id,
    required this.name,
    this.email,
    this.role,
  });

  factory ClientTeamMember.fromJson(Map<String, dynamic> json) {
    return ClientTeamMember(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      email: json['email'],
      role: json['role'],
    );
  }
}

class ClientPortalOverview {
  final List<ClientProject> projects;
  final List<ClientDeliverable> deliverables;
  final List<ClientInvoice> invoices;

  ClientPortalOverview({
    required this.projects,
    required this.deliverables,
    required this.invoices,
  });

  factory ClientPortalOverview.fromJson(Map<String, dynamic> json) {
    return ClientPortalOverview(
      projects: (json['projects'] as List?)
              ?.map((p) => ClientProject.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      deliverables: (json['deliverables'] as List?)
              ?.map((d) => ClientDeliverable.fromJson(d as Map<String, dynamic>))
              .toList() ??
          [],
      invoices: (json['invoices'] as List?)
              ?.map((i) => ClientInvoice.fromJson(i as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}
